#!/bin/bash
# afterBuild hook for Electron Builder
# This script runs after the build completes

echo "[afterBuild] Post-build operations..."

# Verify the build
echo "[afterBuild] Verifying build artifacts..."

# Get the version from package.json
VERSION=$(node -e "console.log(require('../package.json').version)")
echo "[afterBuild] Built TokenRing Coder version $VERSION"

# List the output files
echo "[afterBuild] Build output:"
ls -la dist-electron/

echo "[afterBuild] Electron build complete!"
