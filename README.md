# Generating flamegraphs for a Running Node Service on Linux

This guide assumes a running instance of Lodestar and will walk through how to generate a flamegraph for the process.

## Prerequisites

Install `perf` to generate the stack traces

```bash
sudo apt-get install linux-tools-common linux-tools-generic`
sudo apt-get install linux-tools-`uname -r`  # empirically this throws if run on the same line above
```

Install rendering tools [`brendangregg/FlameGraph`](https://github.com/brendangregg/FlameGraph) and [`Netflix/flamescope`](https://github.com/Netflix/flamescope)



## Modifying Lodestar

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
admin@12.34.56.78: pgrep -f '/usr/src/lodestar/packages/cli/bin/lodestar'
310256
admin@12.34.56.78: sudo perf record -F 99 -p 310256 -g -- sleep 600
admin@12.34.56.78: perf script > out.perf
```

And then copy the `out.perf` file to your local machine and render the flamegraph.

```sh
cd ~/Documents/dev/lodestar/benchmark_data/flamegraphs
scp devops@12.34.56.78:/home/devops/beacon/out.perf .
# TODO: Need to export the below as a script to import in lodestar
./stackcollapse-perf.pl out.perf > out.folded
./flamegraph.pl data/out.folded > lodestar.svg 
```
