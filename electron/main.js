const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsasync = require('fs').promises;
const AdmZip = require('adm-zip');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'hiddenInset', // For macOS
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png') // Add your icon
  });

  // Custom menu
  const template = [
    {
      label: 'ComicFlow',
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
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Comics',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('add-comics')
        },
        { type: 'separator' },
        { role: 'close' }
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
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  try {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (e) {
    console.error('Failed to set application menu:', e);
  }

  // Load app
  mainWindow.loadURL('http://localhost:4200');
    // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
      mainWindow.webContents.openDevTools();
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Comic Files', extensions: ['cbz', 'zip'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('read-bdhq', async (event, filePath) => {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    const pages = zipEntries
      .filter(entry => {
        const ext = path.extname(entry.entryName).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(entry => {
        const buffer = zip.readFile(entry);
        return {
          name: entry.entryName,
          data: buffer.toString('base64'),
          type: path.extname(entry.entryName)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      pages: pages,
      totalPages: pages.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    };
  } catch (error) {
    return null;
  }
});

// Add a new IPC handler for cover extraction only
ipcMain.handle('extract-cover', async (event, filePath) => {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // Find the first valid image file
    const imageEntry = zipEntries.find(entry => {
      const ext = path.extname(entry.entryName).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    });
    
    if (imageEntry) {
      const buffer = zip.readFile(imageEntry);
      const mimeType = getMimeType(path.extname(imageEntry.entryName));
      
      return {
        success: true,
        cover: buffer.toString('base64'),
        mimeType: mimeType,
        fileName: imageEntry.entryName
      };
    }
    
    return {
      success: false,
      error: 'No image files found in archive'
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Helper function for MIME types
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

// implement more IPC handlers as needed fo diretories scan

// Add directory scanning function
async function scanDirectoryRecursive(dirPath, options, currentDepth = 0) {
  const results = [];
  
  try {
    const entries = await fsasync.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip excluded patterns
      const shouldExclude = options.excludePatterns.some(pattern => 
        entry.name.includes(pattern)
      );
      
      if (shouldExclude) continue;
      
      if (entry.isDirectory()) {
        if (options.scanSubdirectories && currentDepth < options.maxDepth) {
          const subResults = await scanDirectoryRecursive(
            fullPath, 
            options, 
            currentDepth + 1
          );
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (options.extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return results;
}



// Add IPC handler for selecting directories
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  
  return result.filePaths[0] || null;
});

// Add IPC handler for getting directory info
ipcMain.handle('get-directory-info', async (event, dirPath) => {
  try {
    const stats = await fsasync.stat(dirPath);
    const files = await fsasync.readdir(dirPath);
    
    // Count comic files in this directory
    let comicCount = 0;
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.cbz', '.zip', '.cbr', '.rar', '.pdf'].includes(ext)) {
        comicCount++;
      }
    }
    
    return {
      success: true,
      name: path.basename(dirPath),
      path: dirPath,
      size: stats.size,
      modified: stats.mtime,
      totalFiles: files.length,
      comicFiles: comicCount
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Add IPC handler for opening directory in file explorer
ipcMain.handle('open-directory', async (event, dirPath) => {
  try {
    await shell.openPath(dirPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Improved directory scanning function
async function scanDirectoryRecursive(dirPath, options, currentDepth = 0) {
  const results = [];
  
  try {
    const entries = await fsasync.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip excluded patterns
      const shouldExclude = options.excludePatterns.some(pattern => {
        if (pattern.startsWith('*')) {
          // Wildcard pattern
          return entry.name.endsWith(pattern.slice(1));
        }
        return entry.name.includes(pattern);
      });
      
      if (shouldExclude) {
        continue;
      }
      
      if (entry.isDirectory()) {
        if (options.scanSubdirectories && currentDepth < options.maxDepth) {
          const subResults = await scanDirectoryRecursive(
            fullPath, 
            options, 
            currentDepth + 1
          );
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (options.extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return results;
}

// Add IPC handler for directory scanning
ipcMain.handle('scan-directory', async (event, dirPath, options) => {
  console.log('Scanning directory:', dirPath, 'with options:', options);
  
  try {
    // Validate directory exists
    await fsasync.access(dirPath);
    const stats = await fsasync.stat(dirPath);
    
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }
    
    const files = await scanDirectoryRecursive(dirPath, options);
    console.log(`Found ${files.length} comic files in ${dirPath}`);
    
    return {
      success: true,
      files: files,
      count: files.length
    };
  } catch (error) {
    console.error('Directory scan failed:', error);
    return {
      success: false,
      error: error.message,
      files: [],
      count: 0
    };
  }
});

// Add IPC handler for counting files in directory (for progress)
ipcMain.handle('count-files-in-directory', async (event, dirPath, options) => {
  try {
    const result = await scanDirectoryRecursive(dirPath, options);
    return {
      success: true,
      count: result.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      count: 0
    };
  }
});

// Add IPC handler to check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fsasync.access(filePath);
    return { exists: true };
  } catch {
    return { exists: false };
  }
});

// Add IPC handler to get file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = await fsasync.stat(filePath);
    return {
      success: true,
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Add IPC handler to read directory contents (for debugging)
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fsasync.readdir(dirPath, { withFileTypes: true });
    return {
      success: true,
      entries: entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});