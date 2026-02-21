/**
 * XPIITAG - Electron Main Process
 * AI Content Attribution & Watermarking System
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Logging setup - defer until app is ready
let log;

function initLogging() {
    // Dynamic require to avoid initialization issues
    try {
        log = require('electron-log');
        log.transports.file.level = 'info';
        log.transports.console.level = 'debug';
    } catch (e) {
        log = {
            info: console.log,
            error: console.error,
            warn: console.warn
        };
    }
}

// Global exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (log) log.error('Uncaught Exception:', error);
    // Only exit if app is ready
    try {
        if (app && app.isReady()) {
            app.exit(1);
        } else {
            process.exit(1);
        }
    } catch (e) {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (log) log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow = null;

function createWindow() {
    log.info('Creating main window...');
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0D1117',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false
        },
        show: false,
        frame: true,
        titleBarStyle: 'default'
    });

    // Load the index.html
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        log.info('Main window displayed');
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
        log.info('Main window closed');
    });

    // Create application menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => openFileDialog()
                },
                {
                    label: 'Save Output',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.send('menu-save')
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => app.quit()
                }
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
                { role: 'selectAll' }
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
            label: 'Help',
            submenu: [
                {
                    label: 'About XPIITAG',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About XPIITAG',
                            message: 'XPIITAG - AI Watermark Stapler',
                            detail: 'Version 1.0.0\n\nA lightweight, hardware-agnostic system for AI content attribution and watermarking.'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function openFileDialog() {
    if (!mainWindow) return;
    
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Supported', extensions: ['png', 'jpg', 'jpeg', 'webp', 'txt', 'md', 'json', 'mp3', 'wav', 'mp4'] },
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
            { name: 'Text Documents', extensions: ['txt', 'md', 'json'] },
            { name: 'Media', extensions: ['mp3', 'wav', 'mp4'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        log.info('File selected:', filePath);
        
        if (!mainWindow) {
            log.warn('No main window available');
            return;
        }
        
        try {
            const data = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase().slice(1);
            mainWindow.webContents.send('file-opened', {
                path: filePath,
                name: path.basename(filePath),
                extension: ext,
                data: data.toString('base64')
            });
        } catch (error) {
            log.error('Error reading file:', error);
            mainWindow.webContents.send('file-error', error.message);
        }
    }
}

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
    await openFileDialog();
});

ipcMain.handle('save-file', async (event, { data, defaultName, filters }) => {
    if (!mainWindow) return { success: false, error: 'No window' };
    
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: filters || [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePath) {
        try {
            const buffer = Buffer.from(data, 'base64');
            fs.writeFileSync(result.filePath, buffer);
            log.info('File saved:', result.filePath);
            return { success: true, path: result.filePath };
        } catch (error) {
            log.error('Error saving file:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false, canceled: true };
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().slice(1);
        return {
            success: true,
            data: data.toString('base64'),
            extension: ext,
            name: path.basename(filePath)
        };
    } catch (error) {
        log.error('Error reading file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
});

// App lifecycle
app.whenReady().then(() => {
    // Initialize logging after app is ready
    initLogging();
    
    log.info('App starting...');
    log.info('App version:', app.getVersion());
    log.info('Electron version:', process.versions.electron);
    log.info('Node version:', process.versions.node);
    
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    log.info('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    log.info('App quitting...');
});
