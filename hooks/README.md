# Electron Build Hooks

This directory contains hooks for the Electron build process.

## beforeBuild.sh

This script runs before the Electron build starts. It:
1. Installs dependencies
2. Builds the frontend (React chat UI)
3. Builds the backend (TokenRing Coder CLI)

## afterBuild.sh

This script runs after the Electron build completes. It:
1. Verifies the build artifacts
2. Lists the output files
3. Reports the version

## Usage

These hooks are automatically executed by `electron-builder` when configured in `electron-builder.json`.
