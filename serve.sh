#! /usr/bin/env nix-shell
#! nix-shell --pure -i dash -I channel:nixos-23.11-small -p dash nodejs
set -eu

./web/node_modules/.bin/http-server