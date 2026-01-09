import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';

// File system operation schemas for validation
const ReadFileSchema = z.object({
  path: z.string()
});

const WriteFileSchema = z.object({
  path: z.string(),
  content: z.string()
});

const ExistsSchema = z.object({
  path: z.string()
});

const StatSchema = z.object({
  path: z.string()
});

const ReadDirectorySchema = z.object({
  path: z.string()
});

// Validate input before sending to main process
function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('Invalid input:', result.error.errors);
    return false;
  }
  return true;
}

// Expose filesystem API to renderer process
contextBridge.exposeInMainWorld('tokenringFS', {
  readFile: async (data: unknown): Promise<{ success: boolean; content?: string; error?: string }> => {
    if (!validateInput(ReadFileSchema, data)) {
      return { success: false, error: 'Invalid input' };
    }
    return ipcRenderer.invoke('fs:readFile', data.path);
  },

  writeFile: async (data: unknown): Promise<{ success: boolean; error?: string }> => {
    if (!validateInput(WriteFileSchema, data)) {
      return { success: false, error: 'Invalid input' };
    }
    return ipcRenderer.invoke('fs:writeFile', data.path, data.content);
  },

  exists: async (data: unknown): Promise<{ success: boolean; exists?: boolean }> => {
    if (!validateInput(ExistsSchema, data)) {
      return { success: false };
    }
    return ipcRenderer.invoke('fs:exists', data.path);
  },

  stat: async (data: unknown): Promise<{ success: boolean; stats?: object; error?: string }> => {
    if (!validateInput(StatSchema, data)) {
      return { success: false, error: 'Invalid input' };
    }
    return ipcRenderer.invoke('fs:stat', data.path);
  },

  readDirectory: async (data: unknown): Promise<{ success: boolean; files?: Array<{ name: string; isDirectory: boolean; isFile: boolean }>; error?: string }> => {
    if (!validateInput(ReadDirectorySchema, data)) {
      return { success: false, error: 'Invalid input' };
    }
    return ipcRenderer.invoke('fs:readDirectory', data.path);
  },

  // Convenience methods
  readTextFile: async (path: string): Promise<string | null> => {
    const result = await ipcRenderer.invoke('fs:readFile', path);
    if (result.success) {
      return result.content;
    }
    return null;
  },

  writeTextFile: async (path: string, content: string): Promise<boolean> => {
    const result = await ipcRenderer.invoke('fs:writeFile', path, content);
    return result.success;
  },

  // Watch for file changes (using chokidar-like polling via IPC)
  watchFile: async (path: string, callback: (event: string, path: string) => void): Promise<() => void> => {
    const listener = (_event: Electron.IpcRendererEvent, data: { event: string; path: string }) => {
      callback(data.event, data.path);
    };

    ipcRenderer.on(`fs:watch-${path}`, listener);

    // Start watching
    await ipcRenderer.invoke('fs:watch', path);

    // Return unsubscribe function
    return () => {
      ipcRenderer.off(`fs:watch-${path}`, listener);
    };
  }
});
