#! /usr/bin/env nix-shell
#! nix-shell --pure --keep LD_LIBRARY_PATH -I channel:nixos-23.11-small -i dash -p nodejs dash
set -eu

echo '{}' > package.json
npm install --save-dev webpack webpack-cli http-server
npm install --save sqlite-wasm-http
