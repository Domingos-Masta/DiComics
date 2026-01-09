const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsasync = require('fs').promises;
const AdmZip = require('adm-zip');
const JSZip = require('jszip');
const unrar = require('node-unrar-js');
const { XMLParser } = require("fast-xml-parser");
const { log } = require('console');

let mainWindow;
// Handle the file paths globally
let filesToOpen = [];
const isMac = process.platform === 'darwin'


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        title: 'DiComics',
        // titleBarStyle: 'hiddenInset', // For macOSrm 
        titleBarStyle: 'hidden',
        backgroundColor: '#0f172a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/icon.ico'),
    });

    // Custom menu
    const template = [
        ...(isMac ?
            [{
                label: app.name,
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
            }] : []),
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
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'About DiComics',
                    click() {
                        mainWindow.webContents.send('on-about-click');
                    }
                }
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
    // Open DevTools in development
    // if (process.env.NODE_ENV === 'development') {
    if (process.env.npm_lifecycle_event === 'electron-dev') {
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, './../dist/dicomics/browser/index.html'));
    }

    // Once the window is ready, process any pending files
    mainWindow.webContents.on('did-finish-load', () => {
        while (filesToOpen.length > 0) {
            mainWindow.webContents.send('open-file', filesToOpen.shift());
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Function to process the file paths
function handleFileOpen(filePath) {
    if (mainWindow) {
        // If the window is ready, send the file path to the renderer process via IPC
        mainWindow.webContents.send('open-file', filePath);
    } else {
        // If the window is not yet created, store the path to be processed later
        filesToOpen.push(filePath);
    }
}

// Windows/Linux: Parse process.argv
if (process.platform === 'win32' || process.platform === 'linux') {
    const fileArg = process.argv[1]; // The second argument is often the file path
    if (fileArg && fileArg !== '.') { // Check if a path was passed
        handleFileOpen(fileArg);
    }
}

// App lifecycle
app.whenReady().then(createWindow);

// macOS: 'open-file' event
app.on('open-file', (event, filePath) => {
    event.preventDefault(); // Prevent default OS handling
    handleFileOpen(filePath);
});

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

ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
});

ipcMain.handle('open-folder', async (event, targetPath) => {
    try {
        const stats = fs.statSync(targetPath);

        if (stats.isDirectory()) {
            // Open folder
            await shell.openPath(targetPath);
        } else if (stats.isFile()) {
            // Open containing folder and select file
            shell.showItemInFolder(targetPath);
        } else {
            throw new Error('Not a file or folder');
        }

        return { success: true };
    } catch (err) {
        console.error('Failed to open path:', err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('read-bdhq', async (event, filePath) => {
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

/**
 * Implementation of new methods and handlers goes here
 */

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

// Function to read CBZ (ZIP) files
async function readZipFile(filePath) {
    try {
        console.debug(`Reading ZIP file: ${filePath}`);

        // Read file as buffer
        const fileBuffer = await fsasync.readFile(filePath);

        // Try AdmZip first
        try {
            const zip = new AdmZip(fileBuffer);
            const zipEntries = zip.getEntries();
            let metadata = null;

            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const metaExtentions = ['.xml'];
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
                                type: ext,
                                size: buffer.length
                            });
                        } catch (err) {
                            console.warn(`Failed to extract ${entry.entryName}:`, err);
                        }
                    } else if (metaExtentions.includes(ext)) {
                        try {
                            const buffer = entry.getData();
                            const parser = new XMLParser();
                            let jsonObject = parser.parse(buffer.toString('utf-8'));
                            console.log('JSON metadata Object:', jsonObject);
                            metadata = jsonObject;
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
                metadata: metadata,
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
                            type: path.extname(file.name),
                            size: fileData.length
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
                return {
                    success: false,
                    error: `Failed to read ZIP file: ${jszipError.message}`,
                    type: 'zip'
                };
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

function extractMetadata(metaEntries, archive) {
    if (!metaEntries || !(metaEntries.length > 0)) return
    const entry = metaEntries[0];
    try {
        const extracted = archive.extract({ files: [entry.name] });
        const files = Array.from(extracted.files);
        let xmlString = '';
        const parser = new XMLParser();
        if (files.length > 0 && files[0].extraction) {
            const buffer = files[0].extraction;
            xmlString = Buffer.from(buffer).toString('utf-8')
        }
        let jsonObject = parser.parse(xmlString);
        return jsonObject;
    } catch (err) {
        console.warn(`Failed to extract ${entry.name}:`, err);
    }
}

/**
 *  Method to extract rar files
 * @param {string} filePath 
 */
// Function to read CBR (RAR) files using node-unrar-js
async function readRarFile(filePath) {
    try {
        // Read the RAR file as buffer
        const fileBuffer = await fsasync.readFile(filePath);

        // Load the RAR file using unrar.js
        const archive = await unrar.createExtractorFromData({
            data: fileBuffer
        });

        const list = archive.getFileList();
        const fileHeaders = Array.from(list.fileHeaders);

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const imageEntries = fileHeaders.filter(header => {
            const ext = path.extname(header.name).toLowerCase();
            return imageExtensions.includes(ext);
        });

        const metaExtentions = ['.xml'];
        const metaEntries = fileHeaders.filter(header => {
            const ext = path.extname(header.name).toLowerCase();
            return metaExtentions.includes(ext);
        });

        const pages = [];
        let metadata = extractMetadata(metaEntries, archive);
        // Extract each image
        for (const entry of imageEntries) {
            try {
                const extracted = archive.extract({ files: [entry.name] });
                const files = Array.from(extracted.files);

                if (files.length > 0 && files[0].extraction) {
                    const buffer = files[0].extraction;
                    pages.push({
                        name: entry.name,
                        data: Buffer.from(buffer).toString('base64'),
                        type: path.extname(entry.name)
                    });
                }
            } catch (err) {
                console.warn(`Failed to extract ${entry.name}:`, err);
            }
        }

        // Sort pages by name
        pages.sort((a, b) => a.name.localeCompare(b.name));
        return {
            success: true,
            pages: pages,
            metadata: metadata,
            totalPages: pages.length,
            type: 'cbr'
        };
    } catch (error) {
        console.error('Error reading RAR file:', error);
        return {
            success: false,
            error: error.message,
            suggestion: 'Make sure the RAR file is not password protected'
        };
    }
}

// Unified comic file reader
async function readComicFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    console.debug(`\n=== Reading comic file ===`);
    console.debug(`File: ${filePath}`);
    console.debug(`Extension: ${ext}`);

    try {
        // Check if file exists and is readable
        await fsasync.access(filePath);
        const stats = await fsasync.stat(filePath);
        console.debug(`File size: ${stats.size} bytes`);

        if (stats.size === 0) {
            return {
                success: false,
                error: 'File is empty',
                file: filePath
            };
        }

        if (ext === '.cbz' || ext === '.zip') {
            console.debug('Detected ZIP format');
            const result = await readZipFile(filePath);
            console.debug(`ZIP read result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (!result.success) console.debug(`Error: ${result.error}`);
            return result;
        }
        else if (ext === '.cbr' || ext === '.rar') {
            console.debug('Detected RAR format');
            const result = await readRarFile(filePath);
            console.debug(`RAR read result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (!result.success) {
                console.debug(`Error: ${result.error}`);
                if (result.suggestion) console.log(`Suggestion: ${result.suggestion}`);
            }
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

// Extract first page as cover
async function extractComicCover(filePath) {
    console.debug(`\n=== Extracting cover ===`);
    console.debug(`File: ${filePath}`);

    try {
        const result = await readComicFile(filePath);

        if (result.success && result.pages && result.pages.length > 0) {
            // const firstPage = result.pages[0];
            const firstPage = findCoverPage(result.pages);
            const mimeType = getMimeType(firstPage.type);

            console.debug(`Cover extracted successfully`);
            console.debug(`- Pages: ${result.pages.length}`);
            console.debug(`- Type: ${result.type}`);
            console.debug(`- Method: ${result.method}`);
            console.debug(`- Metadata: ${result.metadata}`);

            return {
                success: true,
                cover: firstPage.data,
                mimeType: mimeType,
                fileName: firstPage.name,
                totalPages: result.pages.length,
                type: result.type,
                method: result.method,
                metadata: result.metadata
            };
        }

        console.debug(`Cover extraction failed:`, result.error || 'No pages found');
        return {
            success: false,
            error: result.error || 'No pages found in comic',
            suggestion: result.suggestion || '',
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

function findCoverPage(pages) {
    const coverRegex = /^(cover|page0*0|.*000)$/i;
    if (pages && pages.length > 0) {
        for (const page of pages) {
            // Remove the extension for matching
            const nameWithoutExt = page.name.split('.').slice(0, -1).join('.');
            if (coverRegex.test(nameWithoutExt)) {
                return page;
            }
        }
        return pages[0];
    }
    return null;
}

// Test RAR file compatibility
async function testRarCompatibility(filePath) {
    try {
        console.debug(`Testing RAR compatibility: ${filePath}`);

        const fileBuffer = await fsasync.readFile(filePath);
        const extractor = unrar.createExtractorFromData(fileBuffer);

        // Try to get file list
        const list = extractor.getFileList();

        return {
            success: true,
            fileCount: list.fileHeaders.length,
            rarVersion: 'detected',
            canExtract: true,
            details: {
                size: fileBuffer.length,
                fileHeaders: list.fileHeaders.slice(0, 5).map(h => ({
                    name: h.name,
                    size: h.unpSize,
                    encrypted: h.flags.encrypted
                }))
            }
        };
    } catch (error) {
        console.error('RAR compatibility test failed:', error);

        return {
            success: false,
            error: error.message,
            suggestion: 'This RAR file may use an unsupported format (RAR5) or be password protected.'
        };
    }
}

ipcMain.handle('test-rar-compatibility', async (event, filePath) => {
    return await testRarCompatibility(filePath);
});

// Update file dialog to show all comic formats
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Comic Files', extensions: ['cbz', 'zip', 'cbr', 'rar'] },
            { name: 'ZIP Files', extensions: ['cbz', 'zip'] },
            { name: 'RAR Files', extensions: ['cbr', 'rar'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result.filePaths;
});

// Update directory scanning
ipcMain.handle('scan-directory', async (event, dirPath, options) => {
    try {
        const files = await scanDirectoryRecursive(dirPath, options);
        return {
            success: true,
            files: files,
            count: files.length,
            formats: {
                zip: files.filter(f => f.endsWith('.cbz') || f.endsWith('.zip')).length,
                rar: files.filter(f => f.endsWith('.cbr') || f.endsWith('.rar')).length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            files: [],
            count: 0
        };
    }
});

// Add IPC handler to get format support info
ipcMain.handle('get-format-support', async () => {
    return {
        formats: [
            {
                ext: '.cbz',
                name: 'Comic Book ZIP',
                supported: true,
                library: 'adm-zip + jszip',
                notes: 'Fully supported'
            },
            {
                ext: '.zip',
                name: 'ZIP Archive',
                supported: true,
                library: 'adm-zip + jszip',
                notes: 'Fully supported'
            },
            {
                ext: '.cbr',
                name: 'Comic Book RAR',
                supported: true,
                library: 'node-unrar-js',
                notes: 'Supports RAR4, limited RAR5 support'
            },
            {
                ext: '.rar',
                name: 'RAR Archive',
                supported: true,
                library: 'node-unrar-js',
                notes: 'Supports RAR4, limited RAR5 support'
            }
        ],
        limitations: [
            'Password protected RAR files not supported',
            'RAR5 format has limited support',
            'Very large RAR files may cause memory issues'
        ]
    };
});

/**
 * End of new methods and handlers
 */