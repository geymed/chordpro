#!/usr/bin/env bash
# force-yarn.sh — switch project to Yarn Berry even if packageManager points to pnpm
set -euo pipefail

# 0) Neutralize the pnpm pin so Corepack stops forcing pnpm
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.packageManager;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"

# 1) Enable Corepack and activate latest Yarn
corepack enable
corepack prepare yarn@stable --activate

# 2) Use node_modules linker for now (simpler than PnP)
echo 'nodeLinker: node-modules' > .yarnrc.yml

# 3) Lock the chosen Yarn version back into package.json
export YV="$(yarn -v)"
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.packageManager='yarn@'+process.env.YV;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"

# 4) Remove pnpm workspace file if present
rm -f pnpm-workspace.yaml || true

# 5) Install & build
yarn install
yarn install --immutable
yarn workspaces foreach -pt run build

echo '✅ Switched to Yarn Berry.'
