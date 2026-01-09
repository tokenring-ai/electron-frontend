#!/bin/bash
# beforeBuild hook for Electron Builder
# This script runs before the build starts

echo "[beforeBuild] Preparing for Electron build..."

# Ensure dependencies are installed
echo "[beforeBuild] Installing dependencies..."
cd ../..
bun install

# Build the frontend
echo "[beforeBuild] Building frontend..."
cd frontend/chat
bun run build
cd ../..

# Build the backend
echo "[beforeBuild] Building backend..."
cd app/coder
bun run build
cd ../..

echo "[beforeBuild] Build preparation complete!"
