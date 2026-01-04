const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFiles: () => ipcRenderer.invoke('select-files'),
    readCBZ: (filePath) => ipcRenderer.invoke('read-bdhq', filePath),
    extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

    // New directory scanning APIs
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    scanDirectory: (dirPath, options) => ipcRenderer.invoke('scan-directory', dirPath, options),
    countFilesInDirectory: (dirPath, options) => ipcRenderer.invoke('count-files-in-directory', dirPath, options),
    getDirectoryInfo: (dirPath) => ipcRenderer.invoke('get-directory-info', dirPath),
    openDirectory: (dirPath) => ipcRenderer.invoke('open-directory', dirPath),

    // New debugging APIs
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath)
});
