/**
 * XPIITAG - Preload Script
 * Secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFile: (data, defaultName, filters) => 
        ipcRenderer.invoke('save-file', { data, defaultName, filters }),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // App info
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Event listeners
    onFileOpened: (callback) => {
        ipcRenderer.on('file-opened', (event, data) => callback(data));
    },
    onFileError: (callback) => {
        ipcRenderer.on('file-error', (event, error) => callback(error));
    },
    onMenuSave: (callback) => {
        ipcRenderer.on('menu-save', () => callback());
    },
    
    // Platform info
    platform: process.platform
});

// Log preload script loaded
console.log('XPIITAG preload script loaded');
