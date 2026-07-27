/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 * Security: contextIsolation=true, nodeIntegration=false, sandbox=true
 */
const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed IPC channels
const ALLOWED_CHANNELS = [
  'app:getVersion',
  'app:getPlatform',
  'app:openExternal',
  'store:get',
  'store:set',
  'window:minimize',
  'window:maximize',
  'window:close',
];

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // Persistent store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // Environment detection
  isElectron: true,
  isDev: process.env.NODE_ENV === 'development' || process.argv.includes('--dev'),
});
