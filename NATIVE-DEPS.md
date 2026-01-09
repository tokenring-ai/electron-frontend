# Native Dependencies for Electron

Some packages in the TokenRing ecosystem require native Node.js bindings that must be rebuilt for Electron's different Node.js version.

## Packages with Native Dependencies

| Package | Native Dependency | Rebuild Command |
|---------|-------------------|-----------------|
| `@tokenring-ai/drizzle-storage` | better-sqlite3 | `npm run electron:rebuild` |
| `@tokenring-ai/checkpoint` | sqlite3 or better-sqlite3 | `npm run electron:rebuild` |
| `@tokenring-ai/linux-audio` |naudiodon2 | `npm run electron:rebuild` |

## Rebuilding Native Modules

### Automatic Rebuild

```bash
cd app/coder
npm run electron:rebuild
```

This uses `electron-rebuild` to rebuild all native modules for the current Electron version.

### Manual Rebuild

If you need more control:

```bash
cd app/coder
npx electron-rebuild -f -w better-sqlite3
```

### Rebuild with Different Compilers

For native modules that require native compilation:

```bash
# Install build tools (macOS)
xcode-select --install

# Install node-gyp
npm install -g node-gyp

# Rebuild
npx electron-rebuild -f -w better-sqlite3
```

## Troubleshooting

### Build Fails on macOS

1. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

2. Set the correct SDK:
   ```bash
   export SDKROOT=$(xcrun --show-sdk-path --sdk macosx)
   ```

### Build Fails on Windows

1. Install Visual Studio Build Tools
2. Run in Developer Command Prompt:
   ```cmd
   npm run electron:rebuild
   ```

### Build Fails on Linux

1. Install build dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y build-essential python3 libgtk-3-0 libnss3 libnotify4 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxrender1 libxtst6 libappindicator1 libasound2t
   ```

2. Rebuild:
   ```bash
   npm run electron:rebuild
   ```

## Prebuilt Binaries

For some packages, you may be able to use prebuilt binaries:

```bash
# Install prebuilt version
npm install better-sqlite3-prebuilt
```

Check if your package supports prebuilt binaries in the [electron-rebuild](https://github.com/electron/electron-rebuild) database.

## Testing Native Modules

After rebuilding, verify the modules work:

```javascript
// Test better-sqlite3
const Database = require('better-sqlite3');
const db = new Database(':memory:');
console.log('better-sqlite3 works!');
```

## Caching Rebuilds

To speed up rebuilds:

1. Use `--cache-path` to specify a cache directory
2. Avoid rebuilding modules that haven't changed
3. Use parallel builds with `-p` flag:
   ```bash
   npx electron-rebuild -p -f -w better-sqlite3
   ```

## CI/CD

In CI environments, rebuild all native modules:

```bash
cd app/coder
npm run electron:rebuild
```

For GitHub Actions, add before the build:
```yaml
- name: Install dependencies
  run: npm ci

- name: Rebuild native modules
  run: npm run electron:rebuild
```
