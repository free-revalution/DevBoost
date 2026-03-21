#!/bin/bash
set -e
echo "Installing DevBoost..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "Error: Node.js 22+ required"
  exit 1
fi
pnpm install
pnpm build
echo "DevBoost ready!"
