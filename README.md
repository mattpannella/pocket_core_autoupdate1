You need to install `zx` to run this script (https://github.com/google/zx)

If you have npm installed, just run `npm i -g zx`

I think it will run on windows if you use wsl or gitbash or something. but i've only tested this on a mac

Only GitHub repositories will work, and they need to be using the releases feature. It won't do a git pull on the repo, itself

It will try to compare your installed version to the one hosted on github, and download a newer version if available. if it can't figure out your locally installed version, it will just pull the newest one off github anyway

-----------
To run it, put the json file and script in the root of your sd card and run the script


forked from https://gist.github.com/neil-morrison44/34fbb18de90cd9a32ca5bdafb2a812b8 with a few tweaks to suit my needs
