const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsasync = require('fs').promises;
const AdmZip = require('adm-zip');
const JSZip = require('jszip');
const unrar = require('unrar-promise');

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
    console.log(`Reading comic: ${filePath}`);
    return await readComicFile(filePath);
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

// implement more IPC handlers as needed fo diretories scan
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

// Replace the existing extract-cover handler
ipcMain.handle('extract-cover', async (event, filePath) => {
    console.log(`Extracting cover from: ${filePath}`);
    return await extractComicCover(filePath);
});

// Add IPC handler to test file reading
ipcMain.handle('test-comic-file', async (event, filePath) => {
    try {
        const result = await readComicFile(filePath);
        return {
            ...result,
            filePath: filePath,
            fileName: path.basename(filePath)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            filePath: filePath
        };
    }
});

// Add IPC handler to get supported formats
ipcMain.handle('get-supported-formats', async () => {
    return {
        formats: [
            { ext: '.cbz', name: 'Comic Book ZIP', type: 'zip' },
            { ext: '.zip', name: 'ZIP Archive', type: 'zip' },
            { ext: '.cbr', name: 'Comic Book RAR', type: 'rar' },
            { ext: '.rar', name: 'RAR Archive', type: 'rar' }
        ],
        imageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    };
});

/// End of electron/main.js ///
async function scanDirectoryRecursive(dirPath, options, currentDepth = 0) {
    const results = [];

    try {
        const entries = await fsasync.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            // Skip excluded patterns
            const shouldExclude = options.excludePatterns.some(pattern => {
                if (pattern.startsWith('*')) {
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

// Function to read CBZ (ZIP) files using AdmZip
async function readZipFile(filePath) {
    try {
        console.log(`Reading ZIP file: ${filePath}`);
        // Read file as buffer
        const fileBuffer = await fsasync.readFile(filePath);

        // Try AdmZip first
        try {
            const zip = new AdmZip(fileBuffer);
            const zipEntries = zip.getEntries();

            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const pages = [];

            for (const entry of zipEntries) {
                if (!entry.isDirectory) {
                    const ext = path.extname(entry.entryName).toLowerCase();
                    if (imageExtensions.includes(ext)) {
                        try {
                            const buffer = entry.getData();
                            pages.push({
                                name: entry.entryName,
                                data: buffer.toString('base64'),
                                type: ext
                            });
                        } catch (err) {
                            console.warn(`Failed to extract ${entry.entryName}:`, err);
                        }
                    }
                }
            }

            // Sort pages by name
            pages.sort((a, b) => a.name.localeCompare(b.name));

            return {
                success: true,
                pages: pages,
                totalPages: pages.length,
                type: 'zip',
                method: 'adm-zip'
            };
        } catch (admZipError) {
            console.log('AdmZip failed, trying JSZip...', admZipError.message);

            // Fallback to JSZip
            try {
                const zip = await JSZip.loadAsync(fileBuffer);
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
                const imageFiles = [];

                zip.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir) {
                        const ext = path.extname(relativePath).toLowerCase();
                        if (imageExtensions.includes(ext)) {
                            imageFiles.push({
                                name: relativePath,
                                entry: zipEntry
                            });
                        }
                    }
                });

                // Sort by filename
                imageFiles.sort((a, b) => a.name.localeCompare(b.name));

                const pages = [];

                for (const file of imageFiles) {
                    try {
                        const fileData = await file.entry.async('nodebuffer');
                        pages.push({
                            name: file.name,
                            data: fileData.toString('base64'),
                            type: path.extname(file.name)
                        });
                    } catch (err) {
                        console.warn(`Failed to extract ${file.name}:`, err);
                    }
                }

                return {
                    success: true,
                    pages: pages,
                    totalPages: pages.length,
                    type: 'zip',
                    method: 'jszip'
                };
            } catch (jszipError) {
                console.error('JSZip also failed:', jszipError.message);
                throw new Error(`Both ZIP libraries failed: ${admZipError.message}, ${jszipError.message}`);
            }
        }

    } catch (error) {
        console.error('Error reading ZIP file:', error);
        return {
            success: false,
            error: `ZIP reading failed: ${error.message}`,
            type: 'zip'
        };
    }
}

// Function to read CBR (RAR) files using unrar-promise
async function readRarFile(filePath) {
    try {
        console.log(`Reading RAR file: ${filePath}`);

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const pages = [];

        try {
            // List files in RAR archive
            const fileList = await unrar.list(filePath);
            console.log(`RAR contains ${fileList.length} files`);

            // Filter image files
            const imageFiles = fileList.filter(file => {
                const ext = path.extname(file.name).toLowerCase();
                return imageExtensions.includes(ext);
            });

            console.log(`Found ${imageFiles.length} image files in RAR`);

            // Sort by filename
            imageFiles.sort((a, b) => a.name.localeCompare(b.name));

            // Extract each image file
            for (const file of imageFiles) {
                try {
                    console.log(`Extracting: ${file.name}`);
                    const extracted = await unrar.extract(filePath, {
                        files: [file.name],
                        targetPath: path.dirname(filePath)
                    });

                    if (extracted && extracted[file.name]) {
                        const fileBuffer = await fsasync.readFile(extracted[file.name]);
                        pages.push({
                            name: file.name,
                            data: fileBuffer.toString('base64'),
                            type: path.extname(file.name)
                        });

                        // Clean up extracted file
                        await fsasync.unlink(extracted[file.name]).catch(() => { });
                    }
                } catch (extractError) {
                    console.warn(`Failed to extract ${file.name}:`, extractError.message);
                }
            }

            return {
                success: true,
                pages: pages,
                totalPages: pages.length,
                type: 'rar',
                method: 'unrar-promise'
            };

        } catch (rarError) {
            console.error('RAR extraction failed:', rarError);

            // Fallback: Try to extract without listing first
            try {
                console.log('Trying fallback RAR extraction...');
                const extracted = await unrar.unrar(filePath,  path.dirname(filePath));

                if (extracted) {
                    for (const [filename, extractedPath] of Object.entries(extracted)) {
                        const ext = path.extname(filename).toLowerCase();
                        if (imageExtensions.includes(ext)) {
                            try {
                                const fileBuffer = await fsasync.readFile(extractedPath);
                                pages.push({
                                    name: filename,
                                    data: fileBuffer.toString('base64'),
                                    type: ext
                                });

                                // Clean up
                                await fsasync.unlink(extractedPath).catch(() => { });
                            } catch (readError) {
                                console.warn(`Failed to read extracted file ${filename}:`, readError);
                            }
                        }
                    }

                    pages.sort((a, b) => a.name.localeCompare(b.name));

                    return {
                        success: true,
                        pages: pages,
                        totalPages: pages.length,
                        type: 'rar',
                        method: 'unrar-promise-fallback'
                    };
                }
            } catch (fallbackError) {
                console.error('Fallback RAR extraction also failed:', fallbackError);
                throw new Error(`RAR extraction failed: ${rarError.message}`);
            }
        }

    } catch (error) {
        console.error('Error reading RAR file:', error);
        return {
            success: false,
            error: `RAR reading failed: ${error.message}`,
            type: 'rar',
            suggestion: 'Make sure the RAR file is not password protected or corrupted'
        };
    }
}

// Function to read comic files with better error handling
async function readComicFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    console.log(`\n=== Reading comic file ===`);
    console.log(`File: ${filePath}`);
    console.log(`Extension: ${ext}`);

    try {
        // Check if file exists and is readable
        await fsasync.access(filePath);
        const stats = await fsasync.stat(filePath);
        console.log(`File size: ${stats.size} bytes`);

        if (stats.size === 0) {
            return {
                success: false,
                error: 'File is empty',
                file: filePath
            };
        }

        if (ext === '.cbz' || ext === '.zip') {
            console.log('Detected ZIP format');
            const result = await readZipFile(filePath);
            console.log(`ZIP read result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (!result.success) console.log(`Error: ${result.error}`);
            return result;
        }
        else if (ext === '.cbr' || ext === '.rar') {
            console.log('Detected RAR format');

            // Check if unrar is available
            // try {
            //     await unrar.test();
            //     console.log('unrar-promise is available');
            // } catch (unrarError) {
            //     console.error('unrar-promise not working:', unrarError);
            //     return {
            //         success: false,
            //         error: 'RAR support not available. Please make sure unrar is installed on your system.',
            //         type: 'rar',
            //         suggestion: 'Install unrar: macOS: "brew install unrar", Ubuntu/Debian: "sudo apt-get install unrar"'
            //     };
            // }

            const result = await readRarFile(filePath);
            console.log(`RAR read result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (!result.success) console.log(`Error: ${result.error}`);
            return result;
        }
        else {
            return {
                success: false,
                error: `Unsupported file format: ${ext}`,
                supported: ['.cbz', '.zip', '.cbr', '.rar'],
                file: filePath
            };
        }
    } catch (error) {
        console.error(`Failed to process comic file ${filePath}:`, error);
        return {
            success: false,
            error: `File access error: ${error.message}`,
            file: filePath
        };
    }
}

// Extract first page as cover with fallback
async function extractComicCover(filePath) {
    console.log(`\n=== Extracting cover ===`);
    console.log(`File: ${filePath}`);

    try {
        const result = await readComicFile(filePath);

        if (result.success && result.pages && result.pages.length > 0) {
            const firstPage = result.pages[0];
            const mimeType = getMimeType(firstPage.type);

            console.log(`Cover extracted successfully`);
            console.log(`- Pages: ${result.pages.length}`);
            console.log(`- Type: ${result.type}`);
            console.log(`- Method: ${result.method}`);

            return {
                success: true,
                cover: firstPage.data,
                mimeType: mimeType,
                fileName: firstPage.name,
                totalPages: result.pages.length,
                type: result.type,
                method: result.method
            };
        }

        console.log(`Cover extraction failed:`, result.error || 'No pages found');
        return {
            success: false,
            error: result.error || 'No pages found in comic',
            type: result.type
        };
    } catch (error) {
        console.error('Error extracting cover:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// MIME type helper
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

    const ext = extension.toLowerCase();
    return mimeTypes[ext] || 'image/jpeg';
}

// Add IPC handler to check if file is readable
ipcMain.handle('check-comic-file', async (event, filePath) => {
    try {
        const stats = await fsasync.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();

        return {
            exists: true,
            readable: true,
            size: stats.size,
            extension: ext,
            isComic: ['.cbz', '.zip', '.cbr', '.rar'].includes(ext)
        };
    } catch (error) {
        return {
            exists: false,
            readable: false,
            error: error.message
        };
    }
});

// Add IPC handler to get system info
ipcMain.handle('get-system-info', async () => {
    const platform = process.platform;
    let unrarAvailable = false;

    try {
        // Try to detect unrar
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        if (platform === 'win32') {
            await execAsync('where unrar');
        } else {
            await execAsync('which unrar');
        }
        unrarAvailable = true;
    } catch {
        unrarAvailable = false;
    }

    return {
        platform: platform,
        unrarAvailable: unrarAvailable,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        supportedFormats: {
            zip: true,
            rar: unrarAvailable
        }
    };
});

// Add IPC handler for manual RAR extraction test
ipcMain.handle('test-rar-extraction', async (event, filePath) => {
    try {
        console.log(`Testing RAR extraction for: ${filePath}`);

        // Test basic file access
        const stats = await fsasync.stat(filePath);

        // Test unrar availability
        let unrarTest = { available: false, error: null };
        try {
            await unrar.test();
            unrarTest.available = true;
        } catch (error) {
            unrarTest.error = error.message;
        }

        // Try to list files
        let fileList = [];
        try {
            fileList = await unrar.list(filePath);
        } catch (listError) {
            console.log('File listing failed:', listError);
        }

        return {
            success: true,
            fileInfo: {
                path: filePath,
                size: stats.size,
                extension: path.extname(filePath)
            },
            unrar: unrarTest,
            filesInArchive: fileList.length,
            sampleFiles: fileList.slice(0, 5)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});