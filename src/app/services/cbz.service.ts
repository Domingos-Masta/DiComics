import { Injectable, NgZone } from '@angular/core';
import { Comic, ComicPage, CoverPlaceholder } from '../models/comic.model';

// Define Electron API interface
interface ElectronAPI {
    selectFiles: () => Promise<string[]>;
    readBDHQ: (filePath: string) => Promise<any>;
    extractCover: (filePath: string) => Promise<any>;
    getFileInfo: (filePath: string) => Promise<any>;
    selectDirectory: () => Promise<string | null>;
    scanDirectory: (dirPath: string, options: any) => Promise<any>;
    countFilesInDirectory: (dirPath: string, options: any) => Promise<any>;
    getDirectoryInfo: (dirPath: string) => Promise<any>;
    openDirectory: (dirPath: string) => Promise<any>;
    fileExists: (filePath: string) => Promise<{ exists: boolean }>;
    getFileStats: (filePath: string) => Promise<any>;
    readDirectory: (dirPath: string) => Promise<any>;
    testComicFile: (filePath: string) => Promise<any>;
    getSupportedFormats: () => Promise<any>;
    checkComicFile: (filePath: string) => Promise<any>;
    getSystemInfo: () => Promise<any>;
    testRarExtraction: (filePath: string) => Promise<any>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

@Injectable({
    providedIn: 'root'
})
export class CbzService {
    private electronAPI: ElectronAPI | null = null;
    private isElectron = false;
    private supportedFormats: string[] = ['.cbz', '.zip', '.cbr', '.rar'];
    private systemInfo: any = null;

    constructor(private ngZone: NgZone) {
        this.initializeElectronAPI();
    }

    private async initializeElectronAPI(): Promise<void> {
        // Check if we're running in Electron
        if (typeof window !== 'undefined' && window.electronAPI) {
            this.electronAPI = window.electronAPI;
            this.isElectron = true;
            console.log('Electron API initialized successfully');

            // Load system info
            await this.loadSystemInfo();
        } else {
            console.warn('Electron API not available - running in browser mode');
            this.isElectron = false;
        }
    }

    private async loadSystemInfo(): Promise<void> {
        if (this.electronAPI?.getSystemInfo) {
            try {
                this.systemInfo = await this.electronAPI.getSystemInfo();
                console.log('System info:', this.systemInfo);

                // Update supported formats based on system capabilities
                if (!this.systemInfo.supportedFormats.rar) {
                    this.supportedFormats = this.supportedFormats.filter(f => !f.includes('rar'));
                    console.warn('RAR support not available on this system');
                }
            } catch (error) {
                console.error('Failed to load system info:', error);
            }
        }
    }


    // Check if Electron API is available
    isAvailable(): boolean {
        return this.isElectron && this.electronAPI !== null;
    }

    // Get supported file extensions
    getSupportedExtensions(): string[] {
        return [...this.supportedFormats];
    }

    // Check if file extension is supported
    isSupportedFile(filename: string): boolean {
        const ext = this.getFileExtension(filename).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    // Check if RAR is supported
    isRarSupported(): boolean {
        return this.supportedFormats.includes('.cbr') || this.supportedFormats.includes('.rar');
    }

    // Method to wait for Electron API to be ready
    async waitForElectronAPI(timeout = 5000): Promise<boolean> {
        if (this.isAvailable()) {
            return true;
        }

        return new Promise((resolve) => {
            const startTime = Date.now();

            const checkInterval = setInterval(() => {
                if (this.isAvailable()) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.warn('Electron API timeout - running in browser mode');
                    resolve(false);
                }
            }, 100);
        });
    }

    async selectFiles(): Promise<string[]> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.selectFiles) {
            try {
                return await this.electronAPI.selectFiles();
            } catch (error) {
                console.error('Error selecting files:', error);
                throw error;
            }
        }

        // Fallback for browser mode
        console.warn('selectFiles not available - running in browser mode');
        return this.browserSelectFiles();
    }

    async readBDHQ(filePath: string): Promise<{ pages: ComicPage[], totalPages: number, type?: string }> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.readBDHQ) {
            try {
                console.log(`Reading comic file: ${filePath}`);

                // First check if file is readable
                const checkResult = await this.checkComicFile(filePath);
                console.log('File check result:', checkResult);

                if (!checkResult.exists) {
                    throw new Error(`File does not exist: ${filePath}`);
                }

                if (!checkResult.readable) {
                    throw new Error(`File is not readable: ${filePath}`);
                }

                if (!checkResult.isComic) {
                    throw new Error(`Not a supported comic file: ${filePath}`);
                }

                const result = await this.electronAPI.readBDHQ(filePath);
                console.log('Comic read result:', {
                    success: result.success,
                    type: result.type,
                    pages: result.pages?.length,
                    error: result.error
                });

                if (result.success) {
                    return {
                        pages: result.pages.map((page: any, index: number) => ({
                            index,
                            data: page.data,
                            name: page.name,
                            type: page.type,
                            mimeType: this.getMimeType(page.type)
                        })),
                        totalPages: result.totalPages,
                        type: result.type
                    };
                } else {
                    const errorMessage = result.error || 'Failed to read comic file';
                    const suggestion = result.suggestion || '';
                    const ext = this.getFileExtension(filePath).toLowerCase();

                    if (ext === '.cbr' || ext === '.rar') {
                        // Provide specific RAR error guidance
                        if (!this.isRarSupported()) {
                            throw new Error('RAR files require unrar to be installed on your system. Please install unrar and restart the application.');
                        }

                        if (errorMessage.includes('password')) {
                            throw new Error('Password protected RAR files are not supported.');
                        }
                    }

                    throw new Error(`${errorMessage} ${suggestion}`.trim());
                }
            } catch (error: any) {
                console.error('Error reading comic:', error);

                // Provide more context for the error
                const ext = this.getFileExtension(filePath).toLowerCase();
                if (error.message.includes('unrar') || (ext === '.cbr' || ext === '.rar')) {
                    console.error('RAR file error detected');

                    // Try to get more diagnostic info
                    if (this.electronAPI?.testRarExtraction) {
                        try {
                            const testResult = await this.electronAPI.testRarExtraction(filePath);
                            console.log('RAR diagnostic:', testResult);
                        } catch (testError) {
                            console.error('RAR diagnostic failed:', testError);
                        }
                    }
                }

                throw error;
            }
        }

        throw new Error('Comic reading not available in browser mode');
    }

    async checkComicFile(filePath: string): Promise<{
        exists: boolean;
        readable: boolean;
        size?: number;
        extension?: string;
        isComic?: boolean;
        error?: string;
    }> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.checkComicFile) {
            try {
                return await this.electronAPI.checkComicFile(filePath);
            } catch (error) {
                console.error('Error checking comic file:', error);
            }
        }

        // Basic check in browser mode
        return {
            exists: false,
            readable: false,
            error: 'File checking not available'
        };
    }


    async extractCover(filePath: string): Promise<{
        cover: string | null,
        mimeType: string | null,
        fileName?: string,
        totalPages?: number,
        type?: string,
        error?: string
    }> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.extractCover) {
            try {
                console.log(`Extracting cover from: ${filePath}`);
                const result = await this.electronAPI.extractCover(filePath);
                console.log('Cover extraction result:', {
                    success: result.success,
                    type: result.type,
                    pages: result.totalPages,
                    error: result.error
                });

                if (result.success) {
                    return {
                        cover: result.cover,
                        mimeType: result.mimeType,
                        fileName: result.fileName,
                        totalPages: result.totalPages,
                        type: result.type
                    };
                } else {
                    console.warn('Cover extraction failed:', result.error);

                    // Don't fallback for RAR files if RAR isn't supported
                    const ext = this.getFileExtension(filePath).toLowerCase();
                    if ((ext === '.cbr' || ext === '.rar') && !this.isRarSupported()) {
                        return { cover: null, mimeType: null };
                    }

                    // Fallback to reading entire comic for ZIP files
                    try {
                        const fullResult = await this.readBDHQ(filePath);
                        if (fullResult.pages.length > 0) {
                            const firstPage = fullResult.pages[0];
                            return {
                                cover: firstPage.data,
                                mimeType: firstPage.mimeType || this.getMimeType(firstPage.type),
                                fileName: firstPage.name,
                                totalPages: fullResult.pages.length,
                                type: fullResult.type
                            };
                        }
                    } catch (fallbackError) {
                        console.error('Fallback cover extraction failed:', fallbackError);
                    }
                }
            } catch (error) {
                console.error('Error extracting cover:', error);
            }
        }

        return { cover: null, mimeType: null };
    }

    async getFileInfo(filePath: string): Promise<any> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.getFileInfo) {
            try {
                return await this.electronAPI.getFileInfo(filePath);
            } catch (error) {
                console.error('Error getting file info:', error);
            }
        }

        // Browser fallback (limited functionality)
        return {
            name: this.getFileName(filePath),
            path: filePath,
            size: 0,
            modified: new Date()
        };
    }

    async scanDirectory(dirPath: string, options: any): Promise<{
        success: boolean;
        files: string[];
        error?: string;
        count?: number;
    }> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.scanDirectory) {
            try {
                return await this.electronAPI.scanDirectory(dirPath, options);
            } catch (error: any) {
                console.error('Error scanning directory:', error);
                return { success: false, files: [], error: error.message };
            }
        }

        return { success: false, files: [], error: 'Directory scanning not available' };
    }

    async countFilesInDirectory(dirPath: string, options: any): Promise<{
        success: boolean;
        count: number;
        error?: string;
    }> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.countFilesInDirectory) {
            try {
                return await this.electronAPI.countFilesInDirectory(dirPath, options);
            } catch (error: any) {
                console.error('Error counting files:', error);
                return { success: false, count: 0, error: error.message };
            }
        }

        return { success: false, count: 0, error: 'File counting not available' };
    }

    async testComicFile(filePath: string): Promise<any> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.testComicFile) {
            try {
                return await this.electronAPI.testComicFile(filePath);
            } catch (error: any) {
                console.error('Error testing comic file:', error);
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: 'Testing not available' };
    }

    getImageUrl(page: ComicPage): string {
        const mimeType = page.mimeType || `image/${page.type.replace('.', '')}`;
        return `data:${mimeType};base64,${page.data}`;
    }

    getCoverUrl(coverImage: string, mimeType: string = 'image/jpeg'): string {
        return `data:${mimeType};base64,${coverImage}`;
    }

    private getMimeType(fileExtension: string): string {
        const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff'
        };

        const ext = fileExtension.toLowerCase();
        return mimeTypes[ext] || 'image/jpeg';
    }

    // Browser fallback for file selection
    private browserSelectFiles(): Promise<string[]> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.cbz,.zip,.cbr,.rar';

            input.onchange = (event: Event) => {
                const files = (event.target as HTMLInputElement).files;
                if (files) {
                    const filePaths: string[] = [];
                    for (let i = 0; i < files.length; i++) {
                        filePaths.push(files[i].name); // Browser can't access real paths
                    }
                    resolve(filePaths);
                } else {
                    resolve([]);
                }
            };

            input.click();
        });
    }

    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    private getFileExtension(filename: string): string {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    // Generate placeholder data for comics without covers
    generatePlaceholder(comic: Comic): CoverPlaceholder {
        const title = comic.title || 'Comic';
        const colors = [
            'bg-gradient-to-br from-blue-500 to-purple-600',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'bg-gradient-to-br from-orange-500 to-red-600',
            'bg-gradient-to-br from-violet-500 to-pink-600',
            'bg-gradient-to-br from-cyan-500 to-blue-600',
            'bg-gradient-to-br from-rose-500 to-pink-600',
            'bg-gradient-to-br from-amber-500 to-yellow-600',
            'bg-gradient-to-br from-green-500 to-emerald-600',
            'bg-gradient-to-br from-indigo-500 to-blue-600',
            'bg-gradient-to-br from-purple-500 to-indigo-600'
        ];

        // Generate initials from title
        const words = title.split(' ').filter(word => word.length > 0);
        let initials = '';

        if (words.length === 1) {
            initials = words[0].substring(0, 2).toUpperCase();
        } else {
            initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
        }

        // Generate consistent color based on title hash
        const hash = this.stringToHash(title);
        const colorIndex = Math.abs(hash) % colors.length;

        return {
            color: colors[colorIndex],
            initials: initials
        };
    }

    private stringToHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    async getSystemInfo(): Promise<any> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.getSystemInfo) {
            try {
                return await this.electronAPI.getSystemInfo();
            } catch (error) {
                console.error('Error getting system info:', error);
            }
        }

        return null;
    }

    async testRarExtraction(filePath: string): Promise<any> {
        await this.waitForElectronAPI();

        if (this.electronAPI?.testRarExtraction) {
            try {
                return await this.electronAPI.testRarExtraction(filePath);
            } catch (error) {
                console.error('Error testing RAR extraction:', error);
            }
        }

        return null;
    }
}