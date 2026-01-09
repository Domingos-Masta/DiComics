const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFiles: () => ipcRenderer.invoke('select-files'),
    readBDHQ: (filePath) => ipcRenderer.invoke('read-bdhq', filePath),
    extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

    openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

    // New directory scanning APIs
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    scanDirectory: (dirPath, options) => ipcRenderer.invoke('scan-directory', dirPath, options),
    countFilesInDirectory: (dirPath, options) => ipcRenderer.invoke('count-files-in-directory', dirPath, options),
    getDirectoryInfo: (dirPath) => ipcRenderer.invoke('get-directory-info', dirPath),
    openDirectory: (dirPath) => ipcRenderer.invoke('open-directory', dirPath),

    // New debugging APIs
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

    // New comic reading APIs
    testComicFile: (filePath) => ipcRenderer.invoke('test-comic-file', filePath),
    getSupportedFormats: () => ipcRenderer.invoke('get-supported-formats'),

    // Enhanced APIs
    checkComicFile: (filePath) => ipcRenderer.invoke('check-comic-file', filePath),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    testRarExtraction: (filePath) => ipcRenderer.invoke('test-rar-extraction', filePath),

    onOpenAboutModal: (callback) => ipcRenderer.on('on-about-click', callback),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    handleFileOpen: (callback) => ipcRenderer.on('open-file', (event, ...args) => callback(...args))
    
});
