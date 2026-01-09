import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';

// App info schemas
const GetVersionSchema = z.object({});

const GetPlatformSchema = z.object({});

const GetArchSchema = z.object({});

const WindowMinimizeSchema = z.object({});

const WindowMaximizeSchema = z.object({});

const WindowCloseSchema = z.object({});

const BackendErrorSchema = z.object({
  error: z.string()
});

// Expose app API to renderer process
contextBridge.exposeInMainWorld('tokenringApp', {
  getVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('app:getVersion');
  },

  getPlatform: async (): Promise<string> => {
    return ipcRenderer.invoke('app:getPlatform');
  },

  getArch: async (): Promise<string> => {
    return ipcRenderer.invoke('app:getArch');
  },

  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development';
  },

  getElectronVersion: (): string => {
    return process.versions.electron;
  },

  getChromeVersion: (): string => {
    return process.versions.chrome;
  },

  getNodeVersion: (): string => {
    return process.versions.node;
  },

  // Window controls
  window: {
    minimize: async (): Promise<boolean> => {
      return (await ipcRenderer.invoke('window:minimize')).success;
    },

    maximize: async (): Promise<boolean> => {
      return (await ipcRenderer.invoke('window:maximize')).success;
    },

    close: async (): Promise<boolean> => {
      return (await ipcRenderer.invoke('window:close')).success;
    },

    isMaximized: (): boolean => {
      return false;
    },

    isMinimized: (): boolean => {
      return false;
    },

    isFocused: (): boolean => {
      return true;
    }
  },

  // Dialogs
  dialog: {
    openFile: async (options?: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> => {
      return ipcRenderer.invoke('dialog:openFile', options);
    },

    openDirectory: async (options?: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> => {
      return ipcRenderer.invoke('dialog:openDirectory', options);
    },

    saveFile: async (options?: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> => {
      return ipcRenderer.invoke('dialog:saveFile', options);
    },

    showMessageBox: async (options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> => {
      return ipcRenderer.invoke('dialog:showMessageBox', options);
    }
  },

  // Listen for backend errors
  onBackendError: (callback: (error: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { error: string }) => {
      callback(data.error);
    };
    ipcRenderer.on('backend:error', listener);

    // Return unsubscribe function
    return () => {
      ipcRenderer.off('backend:error', listener);
    };
  },

  // Listen for menu events
  onMenuEvent: (callback: (event: string) => void) => {
    ipcRenderer.on('menu:new-chat', () => callback('new-chat'));
    ipcRenderer.on('menu:about', () => callback('about'));

    return () => {
      ipcRenderer.off('menu:new-chat');
      ipcRenderer.off('menu:about');
    };
  },

  // Notifications
  notify: (title: string, body: string): void => {
    new Notification(title, { body });
  },

  // Clipboard
  clipboard: {
    writeText: (text: string): void => {
      ipcRenderer.send('clipboard:writeText', text);
    },

    readText: async (): Promise<string> => {
      return ipcRenderer.invoke('clipboard:readText');
    }
  },

  // Shell integration
  shell: {
    openExternal: async (url: string): Promise<boolean> => {
      return ipcRenderer.invoke('shell:openExternal', url);
    },

    openPath: async (path: string): Promise<string> => {
      return ipcRenderer.invoke('shell:openPath', path);
    }
  }
});

// Expose utility functions
contextBridge.exposeInMainWorld('tokenringUtil', {
  // Debounce function
  debounce: <T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  // Throttle function
  throttle: <T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Deep clone (JSON based)
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Generate unique ID
  generateId: (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
});
