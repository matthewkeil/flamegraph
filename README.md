# Generating flamegraphs for a Running Node Service on Linux

This guide assumes a running instance of Lodestar and will walk through how to generate a flamegraph for the process.

## Installation

Install rendering tools [0x](https://github.com/davidmarkclements/0x.git), [`FlameGraph`](https://github.com/brendangregg/FlameGraph) and [`flamescope`](https://github.com/Netflix/flamescope).  They are all submodules of this repo so:

```sh
git submodule update --init --recursive
```

## Modifying Lodestar

Install `perf` to generate the stack traces.  You may get a warning about needing to restart the VM due to kernel updates.  If so, cancel out of the restart.

```bash
sudo apt-get install linux-tools-common linux-tools-generic
sudo apt-get install linux-tools-`uname -r`  # empirically this throws if run on the same line above
```

SSH into the Lodestar instance and modify `~/beacon/beacon_run.sh` to add a necessary flag.

```sh
admin@12.34.56.78: cd ~/beacon
admin@12.34.56.78: vim beacon_run.sh # add --perf-basic-prof-only-functions
admin@12.34.56.78: cat beacon_run.sh # should look something like this when done
#!/bin/bash

# Load location of node to bin path
source ~/.nvm/nvm.sh

# Allows to edit node args, and lodestar args
# To apply changes, restart the systemd service
# ```
# systemctl restart beacon
# ```
#
# DON'T FORGET '\' CHARACTER WHEN EDITING FLAGS!!

node \
  --perf-basic-prof-only-functions \
  --max-old-space-size=4096 \
  /usr/src/lodestar/packages/cli/bin/lodestar \
  beacon \
  --rcConfig /home/devops/beacon/rcconfig.yml
admin@12.34.56.78: sudo systemctl restart beacon.service
admin@12.34.56.78: sudo perf record -F 99 -p $(pgrep -f '/usr/src/lodestar/packages/cli/bin/lodestar beacon') -g -- sleep 60
admin@12.34.56.78: sudo chmod 777 ~/beacon/perf.data
```

And then copy the `perf.data` file to your local machine and render the flamegraph. From this repo root run:

```sh
scp admin@12.34.56.78:/home/devops/beacon/out.perf ./data/perf.data

```
