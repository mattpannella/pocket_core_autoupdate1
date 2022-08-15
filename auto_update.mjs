#!/usr/bin/env zx


// a `auto_update.json` file must be present of the form
/*
[
  {
    "repo": {
      "user": "spiritualized1997",
      "project": "openFPGA-GBA"
      }
  },
  {
    "repo": {
      "user": "spiritualized1997",
      "project": "openFPGA-GB-GBC"
      },
    "name": "Spiritualized.GBC"
  },
  {
    "repo": {
      "user": "spacemen3",
      "project": "PDP-1"
      }
  },
  {
    "repo": {
      "user": "Mazamars312",
      "project": "Analogue_Pocket_Neogeo"
      },
    "name": "Mazamars312.NeoGeo",
    "allowPrerelease": true
  }
]
*/
//allowPrelease will download prelease builds, otherwise they are ignored
// then this script gets run via zx (see https://github.com/google/zx) at the root of the SD card

const util = require('node:util');

const semverRegex = new RegExp("^[0-9]+\.[0-9]+\.[0-9]+$");

const semverFinder = /\D*(\d(\.\d)*\.\d)\D*/;

const isActuallySemver = (potentiallySemver) => semverRegex.test(potentiallySemver);

const apiUrl = "https://api.github.com/repos/%s/%s/releases";

const ZIP_TYPE = "application/x-zip-compressed";

//even though its technically not a valid semver, allow use of 2 part versions, and just add a .0 to complete the 3rd part
const semverFix = (version) => {
  let parts = version.split(".");
  if(parts.length == 2) {
    version += ".0";
  }
  return version;
}

const semverCompare = (semverA, semverB) => {
  // return true if A is more recent than B
  const [majorA, minorA, patchA] = semverA.split(".").map((i) => parseInt(i));
  const [majorB, minorB, patchB] = semverB.split(".").map((i) => parseInt(i));

  if (majorA > majorB) return true;
  if (majorB > majorA) return false;

  if (minorA > minorB) return true;
  if (minorB > minorA) return false;

  if (patchA > patchB) return true;
  if (patchB > patchA) return false;

  return false;
}

const updateCore = async (downloadLink) => {
  console.log(chalk.green(`Updating core, downloading ${downloadLink}...`));
  await $`curl ${downloadLink} --location --output core.zip`;
  await $`unzip -o core.zip`;
  await $`rm core.zip`;
}

const reposList = await fs.readJson("./auto_update.json");

for (let index = 0; index < reposList.length; index++) {
  const {repo, name, allowPrerelease} = reposList[index];
  const url = util.format(apiUrl, repo.user, repo.project);
  const releases = await (await fetch(url)).json();
  if(releases.message) {
    console.log(chalk.red(releases.message));
    process.exit();
  }
  if(allowPrerelease) {
    var mostRecentRelease = releases.filter(({draft}) => !(draft))[0]
  } else {
    var mostRecentRelease = releases.filter(({draft, prerelease}) => !(draft || prerelease))[0]
  }
  
  const {tag_name, assets} = mostRecentRelease;
  
  let matches = tag_name.match(semverFinder);
  var releaseSemver = matches[1];
  releaseSemver = semverFix(releaseSemver);

  let coreAsset = null;

  // might need to search for the right zip here if there's more than one
  //iterate through assets to find the zip release
  for(let i = 0; i < assets.length; i++) {
    if(assets[i].content_type == ZIP_TYPE) {
      coreAsset = assets[i];
      break;
    }
  }
  
  if(coreAsset == null) {
    console.log("No zip file found for release. Skipping");
    continue;
  }
  
  const nameGuess = name ?? coreAsset.name.split("_")[0];
  console.log(chalk.blue(`${tag_name} is the most recent release, checking local core...`));
  const fileExists = await fs.exists(`./Cores/${nameGuess}/core.json`);

  if (fileExists){
    const localData = await fs.readJson(`./Cores/${nameGuess}/core.json`);
    let ver_string = localData.core.metadata.version;
    
    matches = ver_string.match(semverFinder);
    if(matches && matches.length > 1) {
      var localSemver = matches[1];
      localSemver = semverFix(localSemver);
    } else {
      var localSemver = "";
    }

    console.log(chalk.yellow(`Local core found: v${localSemver}`));

    if (!isActuallySemver(localSemver) || !isActuallySemver(releaseSemver)){
      console.log(chalk.red("Code not semver'd, downloading just incase..."));
      // could compare release dates here but you'd miss any releases made within 1 day
      updateCore(coreAsset.browser_download_url);
      continue
    }

    if (semverCompare(releaseSemver, localSemver)){
      updateCore(coreAsset.browser_download_url);
    }else{
      console.log(chalk.yellow(`Up to date, skipping core.`));
    }
  }else{
    updateCore(coreAsset.browser_download_url);
  }
  console.log("\n");
}
