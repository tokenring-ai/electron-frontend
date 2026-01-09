#!/usr/bin/env node
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  window: {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'TokenRing Coder'
  },
  backend: {
    port: 3456,
    host: '127.0.0.1'
  },
  frontend: {
    devPort: 5173,
    productionUrl: 'http://127.0.0.1:3456/chat/'
  }
};

class TokenRingCoderApp {
  private mainWindow: BrowserWindow | null = null;
  private backendProcess: ChildProcess | null = null;
  private tray: Tray | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';

  async start() {
    // Single instance lock
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    // Handle second instance
    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    // Initialize when ready
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIpcHandlers();
      this.createTray();
    });

    // Handle window-all-closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown();
      }
    });

    // Handle will-quit
    app.on('will-quit', async (event) => {
      event.preventDefault();
      await this.shutdown();
      app.exit(0);
    });

    // Handle activate (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: CONFIG.window.width,
      height: CONFIG.window.height,
      minWidth: CONFIG.window.minWidth,
      minHeight: CONFIG.window.minHeight,
      title: CONFIG.window.title,
      icon: this.getIconPath(),
      backgroundColor: '#1e1e1e',
      show: false, // Don't show until ready
      webPreferences: {
        preload: path.resolve(__dirname, 'preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();

      // Open DevTools in development
      if (this.isDevelopment) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Create menu
    this.createMenu();

    // Load the frontend
    this.loadFrontend();

    // Start backend
    this.startBackend();

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private async loadFrontend() {
    if (this.isDevelopment) {
      await this.mainWindow?.loadURL(`http://localhost:${CONFIG.frontend.devPort}/chat`);
    } else {
      // Wait a moment for backend to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.mainWindow?.loadURL(CONFIG.frontend.productionUrl);
    }
  }

  private async startBackend() {
    try {
      const packageDir = path.resolve(__dirname, '../');
      const backendPath = this.isDevelopment
        ? path.resolve(packageDir, 'dist/tr-coder.js')
        : path.resolve(process.resourcesPath || '', 'app/dist/tr-coder.js');

      // Check if backend file exists
      try {
        await fs.access(backendPath);
      } catch {
        console.error(`Backend not found at ${backendPath}`);
        throw new Error('Backend executable not found');
      }

      // Spawn backend process
      const args = [
        '--workingDirectory', path.resolve(process.env.HOME || process.env.USERPROFILE || '.'),
        '--dataDirectory', path.resolve(process.env.HOME || process.env.USERPROFILE || '.tokenring'),
        '--http', `${CONFIG.backend.host}:${CONFIG.backend.port}`
      ];

      this.backendProcess = spawn('node', [backendPath, ...args], {
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle backend output
      this.backendProcess.stdout?.on('data', (data) => {
        console.log(`[Backend] ${data.toString()}`);
      });

      this.backendProcess.stderr?.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString()}`);
      });

      this.backendProcess.on('error', (error) => {
        console.error('[Backend] Failed to start:', error);
        this.showBackendError(error.message);
      });

      this.backendProcess.on('exit', (code, signal) => {
        console.log(`[Backend] Exited with code ${code}, signal ${signal}`);
        if (code !== 0 && code !== null) {
          this.showBackendError(`Backend process exited with code ${code}`);
        }
        this.backendProcess = null;
      });

      console.log(`[Backend] Started with PID ${this.backendProcess.pid}`);
    } catch (error) {
      console.error('[Backend] Failed to start:', error);
      this.showBackendError(`Failed to start backend: ${error}`);
    }
  }

  private showBackendError(message: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('backend:error', message);
    }
  }

  private setupIpcHandlers() {
    // Handle filesystem operations
    ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('fs:exists', async (_event, filePath: string) => {
      try {
        await fs.access(filePath);
        return { success: true, exists: true };
      } catch {
        return { success: true, exists: false };
      }
    });

    ipcMain.handle('fs:stat', async (_event, filePath: string) => {
      try {
        const stats = await fs.stat(filePath);
        return {
          success: true,
          stats: {
            size: stats.size,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            mtime: stats.mtime,
          }
        };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries.map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile()
        }));
        return { success: true, files };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Dialog operations
    ipcMain.handle('dialog:openFile', async (event, options = {}) => {
      if (!this.mainWindow) throw new Error('No main window');
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
      if (!this.mainWindow) throw new Error('No main window');
      const result = await dialog.showOpenDialog(this.mainWindow, {
        ...options,
        properties: ['openDirectory']
      });
      return result;
    });

    ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
      if (!this.mainWindow) throw new Error('No main window');
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });

    // App info
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });

    ipcMain.handle('app:getArch', () => {
      return process.arch;
    });

    // Window control
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
      return { success: true };
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
      return { success: true };
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
      return { success: true };
    });
  }

  private createMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Chat',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu:new-chat');
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        role: 'windowMenu',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About TokenRing Coder',
            click: () => {
              this.mainWindow?.webContents.send('menu:about');
            }
          },
          {
            label: 'Documentation',
            click: () => {
              // Open documentation URL
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              // Open GitHub issues
            }
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private createTray() {
    if (process.platform === 'darwin') {
      // System tray is handled differently on macOS
      return;
    }

    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    icon.resize({ width: 16, height: 16 });

    this.tray = new Tray(icon);
    this.tray.setToolTip('TokenRing Coder');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => this.mainWindow?.show() },
      { label: 'Hide', click: () => this.mainWindow?.hide() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);

    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.focus();
        } else {
          this.mainWindow.show();
        }
      }
    });
  }

  private getIconPath(): string {
    const iconNames: Record<string, string> = {
      darwin: 'icon.icns',
      win32: 'icon.ico',
      linux: 'icon.png'
    };
    const iconName = iconNames[process.platform] || 'icon.png';
    return path.resolve(__dirname, `resources/${iconName}`);
  }

  private async shutdown() {
    console.log('[App] Shutting down...');

    // Stop backend process
    if (this.backendProcess) {
      console.log('[App] Stopping backend...');
      this.backendProcess.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.backendProcess && !this.backendProcess.killed) {
          console.log('[App] Force killing backend...');
          this.backendProcess.kill('SIGKILL');
        }
      }, 5000);

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[App] Shutdown complete');
  }
}

// Start the app
const tokenRingApp = new TokenRingCoderApp();
tokenRingApp.start().catch(console.error);
