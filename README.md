# TokenRing Coder Electron App

This directory contains the Electron application for TokenRing Coder.

## Directory Structure

```
electron/
├── main.ts                    # Electron main process (Node.js)
├── plugin.ts                  # TokenRing plugin for Electron
├── vite.electron.config.ts    # Vite configuration for renderer
├── electron-builder.json      # electron-builder configuration
├── preload/
│   ├── index.ts              # Preload entry point
│   ├── fsBridge.ts           # Filesystem IPC bridge
│   └── apiBridge.ts          # App API IPC bridge
├── resources/
│   ├── icon.icns             # macOS icon
│   ├── icon.ico              # Windows icon
│   ├── icon.png              # Linux icon
│   ├── background.png        # DMG background
│   ├── entitlements.plist    # macOS entitlements
│   └── LICENSE              # License file
└── hooks/
    ├── beforeBuild.sh        # Pre-build hook
    └── afterBuild.sh         # Post-build hook
```

## Architecture

### Main Process (`main.ts`)

The main process handles:
- Application lifecycle (startup, shutdown)
- Window management (create, resize, close)
- IPC handlers (filesystem, dialogs, app info)
- Backend process management (spawns the TokenRing Coder CLI)

### Renderer Process

The renderer process loads the React chat UI served by the backend:
- Runs in a sandboxed environment
- Communicates with main process via preload scripts
- Uses context bridge for secure IPC

### Preload Scripts

Preload scripts expose secure APIs to the renderer:
- `tokenringFS`: Filesystem operations (readFile, writeFile, etc.)
- `tokenringApp`: App utilities (version, platform, dialogs, window controls)
- `tokenringUtil`: Utility functions (debounce, throttle, etc.)

## Development

### Prerequisites

1. Install dependencies:
   ```bash
   cd app/coder
   bun install
   ```

2. Install Electron dependencies:
   ```bash
   npm run electron:rebuild
   ```

### Development Mode

Run both frontend and backend in development mode:
```bash
cd app/coder
npm run electron:dev
```

This will:
1. Build the backend with watch mode
2. Start the frontend dev server on port 5173
3. Run the Electron app (connects to localhost:5173)

### Building for Production

Build the Electron app for the current platform:
```bash
cd app/coder
npm run electron:build
```

This will:
1. Build the frontend React app
2. Build the backend CLI
3. Package everything with electron-builder
4. Output to `dist-electron/`

### Platform-Specific Builds

```bash
# macOS
npm run electron:package:mac

# Windows
npm run electron:package:win

# Linux
npm run electron:package:linux
```

### Preview Built App

```bash
npm run electron:preview
```

## Security Considerations

The Electron app follows security best practices:

1. **Context Isolation**: Enabled (`contextIsolation: true`)
2. **Node Integration**: Disabled in renderer (`nodeIntegration: false`)
3. **Sandboxing**: Enabled (`sandbox: true`)
4. **Web Security**: Enabled (`webSecurity: true`)
5. **Preload Scripts**: All IPC goes through `contextBridge`

## Native Dependencies

Some packages (like SQLite) require native Node.js bindings. These must be rebuilt for Electron using `electron-rebuild`:

```bash
npm run electron:rebuild
```

## Distribution

### macOS

- Produces: `.dmg` and `.zip` files
- Requires: Apple Developer ID for notarization
- Entitlements: Configured in `resources/entitlements.plist`

### Windows

- Produces: `.exe` installer and `.zip` archive
- Target: NSIS installer
- Publisher: TokenRing AI

### Linux

- Produces: `.AppImage`, `.deb`, `.rpm`, and `.snap`
- Categories: Development;IDE

## Troubleshooting

### Backend Not Starting

Check the console output for errors:
1. Verify `dist/tr-coder.js` exists
2. Check Node.js is in PATH
3. Verify all dependencies are installed

### Frontend Not Loading

1. Check Vite dev server is running on port 5173
2. Verify CORS headers are configured
3. Check browser console for errors

### IPC Not Working

1. Verify preload script path is correct
2. Check `contextBridge.exposeInMainWorld` calls
3. Ensure `contextIsolation: true` is set

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron-builder.io/)
- [Vite Plugin for Electron](https://electron-vite.org/)
- [Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
