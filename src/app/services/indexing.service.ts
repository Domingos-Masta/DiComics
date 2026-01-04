import { Injectable, EventEmitter } from '@angular/core';
import { Comic, ComicSource } from '../models/comic.model';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { CbzService } from './cbz.service';

@Injectable({
    providedIn: 'root'
})
export class IndexingService {
    private isIndexing = false;
    private currentProgress = {
        total: 0,
        processed: 0,
        currentFile: '',
        currentSource: '',
        percent: 0
    };

    // Events for components to listen to
    indexingStarted = new EventEmitter<void>();
    indexingProgress = new EventEmitter<{
        total: number,
        processed: number,
        currentFile: string,
        currentSource: string,
        percent: number
    }>();
    indexingCompleted = new EventEmitter<{ added: number, updated: number, removed: number }>();
    indexingError = new EventEmitter<Error>();
    comicsUpdated = new EventEmitter<void>();

    constructor(
        private storageService: StorageService,
        private settingsService: SettingsService,
        private cbzService: CbzService
    ) { }

    async indexAllSources(): Promise<{ added: number, updated: number, removed: number }> {
        console.log('=== STARTING INDEXING ===');
        console.log('CbzService available:', this.cbzService.isAvailable());

        if (this.isIndexing) {
            console.error('Indexing already in progress');
            throw new Error('Indexing already in progress');
        }

        this.isIndexing = true;
        this.currentProgress = { total: 0, processed: 0, currentFile: '', currentSource: '', percent: 0 };
        this.indexingStarted.emit();

        try {
            const settings = this.settingsService.getSettings();
            const sources = this.settingsService.getComicSources()
                .filter(source => source.enabled && source.type === 'directory');

            console.log('Enabled sources:', sources);

            if (sources.length === 0) {
                throw new Error('No enabled directory sources found');
            }

            let totalAdded = 0;
            let totalUpdated = 0;
            let totalRemoved = 0;

            // Get all existing comics
            const existingComics = this.storageService.getComics();
            const existingPaths = new Set(existingComics.map(c => c.filePath));
            const foundPaths = new Set<string>();

            // First, count total files for progress
            let totalFiles = 0;
            for (const source of sources) {
                try {
                    console.log(`Counting files in: ${source.path}`);
                    const countResult = await this.cbzService.countFilesInDirectory(source.path, {
                        scanSubdirectories: settings.scanSubdirectories,
                        maxDepth: settings.maxScanDepth,
                        extensions: settings.fileExtensions,
                        excludePatterns: settings.excludePatterns
                    });

                    console.log(`Count result for ${source.path}:`, countResult);

                    if (countResult.success) {
                        totalFiles += countResult.count;
                    }
                } catch (error) {
                    console.error(`Error counting files in ${source.name}:`, error);
                }
            }

            this.currentProgress.total = totalFiles;
            console.log(`Total files to index: ${totalFiles}`);

            if (totalFiles === 0) {
                console.log('No files found to index');
                this.indexingCompleted.emit({ added: 0, updated: 0, removed: 0 });
                return { added: 0, updated: 0, removed: 0 };
            }

            // Scan each source directory
            for (const source of sources) {
                try {
                    this.currentProgress.currentSource = source.name;
                    console.log(`\n=== Indexing source: ${source.name} (${source.path}) ===`);

                    const scanResult = await this.cbzService.scanDirectory(source.path, {
                        scanSubdirectories: settings.scanSubdirectories,
                        maxDepth: settings.maxScanDepth,
                        extensions: settings.fileExtensions,
                        excludePatterns: settings.excludePatterns
                    });

                    console.log(`Scan result for ${source.name}:`, scanResult);

                    if (!scanResult.success) {
                        console.error(`Failed to scan ${source.name}:`, scanResult.error);
                        continue;
                    }

                    const files = scanResult.files;
                    console.log(`Found ${files.length} files in ${source.name}`);

                    if (files.length === 0) {
                        console.log(`No comic files found in ${source.name}`);
                        continue;
                    }

                    // Process each file
                    for (const filePath of files) {
                        const fileName = this.getFileName(filePath);
                        this.currentProgress.currentFile = fileName;
                        this.currentProgress.processed++;

                        const percent = Math.round((this.currentProgress.processed / this.currentProgress.total) * 100);
                        this.currentProgress.percent = percent;

                        console.log(`Processing [${this.currentProgress.processed}/${totalFiles}] ${percent}%: ${fileName}`);

                        if (!existingPaths.has(filePath)) {
                            // New file - index it
                            console.log(`New file detected: ${fileName}`);
                            const comic = await this.indexFile(filePath);
                            if (comic) {
                                totalAdded++;
                                console.log(`✓ Added comic: ${comic.title}`);
                            }
                        } else {
                            // Existing file - check if needs update
                            const comic = existingComics.find(c => c.filePath === filePath);
                            if (comic) {
                                console.log(`Existing file: ${comic.title}`);
                                if (this.shouldUpdateComic(comic, filePath)) {
                                    console.log(`Updating comic: ${comic.title}`);
                                    await this.updateComic(comic, filePath);
                                    totalUpdated++;
                                }
                            }
                        }

                        foundPaths.add(filePath);

                        // Emit progress event
                        this.indexingProgress.emit({ ...this.currentProgress });

                        // Small delay to prevent UI freeze
                        await this.delay(50);
                    }

                    // Update source statistics
                    this.settingsService.updateComicSource(source.id, {
                        lastIndexed: new Date(),
                        totalComics: files.length
                    });

                    console.log(`✓ Completed indexing ${source.name}`);

                } catch (error) {
                    console.error(`Error indexing source ${source.name}:`, error);
                    this.indexingError.emit(error as Error);
                }
            }

            // Remove comics that no longer exist
            console.log('\n=== Removing missing comics ===');
            for (const comic of existingComics) {
                if (!foundPaths.has(comic.filePath)) {
                    console.log(`Removing missing comic: ${comic.title}`);
                    this.storageService.deleteComic(comic.id);
                    totalRemoved++;
                }
            }

            console.log(`\n=== INDEXING COMPLETED ===`);
            console.log(`Added: ${totalAdded}`);
            console.log(`Updated: ${totalUpdated}`);
            console.log(`Removed: ${totalRemoved}`);

            const result = { added: totalAdded, updated: totalUpdated, removed: totalRemoved };
            this.indexingCompleted.emit(result);
            this.comicsUpdated.emit();

            return result;

        } catch (error) {
            console.error('Indexing failed:', error);
            this.indexingError.emit(error as Error);
            throw error;
        } finally {
            this.isIndexing = false;
            this.currentProgress = { total: 0, processed: 0, currentFile: '', currentSource: '', percent: 0 };
            console.log('=== INDEXING FINISHED ===');
        }
    }

    public async indexFile(filePath: string): Promise<Comic | null> {
        try {
            console.log(`\n=== Indexing file ===`);
            console.log(`Path: ${filePath}`);

            // Check if file is readable first
            const fileCheck = await this.cbzService.checkComicFile(filePath);
            console.log('File check:', fileCheck);

            if (!fileCheck.exists || !fileCheck.readable) {
                console.error(`File is not accessible: ${filePath}`);
                return null;
            }

            const ext = this.getFileExtension(filePath).toLowerCase();
            console.log(`Extension: ${ext}`);

            // Skip RAR files if not supported
            if ((ext === '.cbr' || ext === '.rar') && !this.cbzService.isRarSupported()) {
                console.warn(`RAR files not supported on this system: ${filePath}`);

                // Create basic comic entry without cover
                const basicComic: Comic = {
                    id: this.generateId(),
                    title: this.getFileName(filePath).replace(/\.[^/.]+$/, ""),
                    filePath: filePath,
                    totalPages: 0,
                    currentPage: 0,
                    readPages: [],
                    bookmarks: [],
                    isRead: false,
                    lastRead: new Date(),
                    addedDate: new Date(),
                    fileSize: fileCheck.size || 0,
                    hasCover: false
                };

                this.storageService.addComic(basicComic);
                console.log(`Created basic comic entry (RAR not supported): ${basicComic.title}`);
                return basicComic;
            }

            const fileInfo = await this.cbzService.getFileInfo(filePath);
            if (!fileInfo) {
                console.error(`Could not get file info: ${filePath}`);
                return null;
            }

            console.log(`File info:`, { name: fileInfo.name, size: fileInfo.size });

            // Extract cover with timeout
            let coverData = null;
            let hasCover = false;
            let coverImageUrl = null;
            let totalPages = 0;
            let fileType = ext;

            try {
                console.log(`Extracting cover...`);
                coverData = await this.cbzService.extractCover(filePath);
                console.log(`Cover extraction:`, {
                    success: !!coverData.cover,
                    type: coverData.type,
                    pages: coverData.totalPages
                });

                if (coverData.cover && coverData.mimeType) {
                    hasCover = true;
                    coverImageUrl = this.cbzService.getCoverUrl(coverData.cover, coverData.mimeType);
                    fileType = coverData.type || ext;
                    totalPages = coverData.totalPages || 0;
                    console.log(`✓ Cover extracted`);
                } else {
                    console.log(`✗ No cover extracted: ${coverData.error || 'Unknown error'}`);
                }

                // Get total pages if not from cover extraction
                if (totalPages === 0) {
                    console.log(`Getting page count...`);
                    try {
                        const fullData = await this.cbzService.readBDHQ(filePath);
                        totalPages = fullData.pages.length;
                        fileType = fullData.type || fileType;
                        console.log(`✓ Found ${totalPages} pages`);
                    } catch (pageError: any) {
                        console.warn(`Could not get page count: ${pageError.message}`);
                    }
                }
            } catch (error: any) {
                console.warn(`Failed to extract data from ${fileInfo.name}:`, error.message);
            }

            const comic: Comic = {
                id: this.generateId(),
                title: this.cleanTitle(fileInfo.name),
                filePath: filePath,
                coverImage: coverData?.cover || undefined,
                coverImageUrl: coverImageUrl || undefined,
                totalPages: totalPages,
                currentPage: 0,
                readPages: [],
                bookmarks: [],
                isRead: false,
                lastRead: new Date(),
                addedDate: new Date(),
                fileSize: fileInfo.size,
                hasCover: hasCover
            };

            console.log(`Created comic:`, {
                title: comic.title,
                hasCover: comic.hasCover,
                pages: comic.totalPages,
                type: fileType
            });

            this.storageService.addComic(comic);
            console.log(`✓ Indexed: ${comic.title}`);

            return comic;

        } catch (error) {
            console.error(`Error indexing file ${filePath}:`, error);

            // Create a basic comic entry for failed files
            const basicComic: Comic = {
                id: this.generateId(),
                title: this.getFileName(filePath).replace(/\.[^/.]+$/, ""),
                filePath: filePath,
                totalPages: 0,
                currentPage: 0,
                readPages: [],
                bookmarks: [],
                isRead: false,
                lastRead: new Date(),
                addedDate: new Date(),
                fileSize: 0,
                hasCover: false
            };

            this.storageService.addComic(basicComic);
            console.log(`Created basic comic entry (indexing failed): ${basicComic.title}`);

            return basicComic;
        }
    }

    private async updateComic(comic: Comic, filePath: string): Promise<void> {
        try {
            const fileInfo = await this.cbzService.getFileInfo(filePath);
            if (!fileInfo) return;

            // Check if file was modified
            const fileModified = new Date(fileInfo.modified);
            const comicAdded = new Date(comic.addedDate);

            if (fileModified > comicAdded || !comic.hasCover || comic.totalPages === 0) {
                console.log(`File needs update: ${comic.title}`);

                // Re-extract cover
                const coverData = await this.cbzService.extractCover(filePath);
                const updates: Partial<Comic> = {
                    fileSize: fileInfo.size,
                    addedDate: new Date()
                };

                if (coverData.cover && coverData.mimeType) {
                    updates.coverImage = coverData.cover;
                    updates.coverImageUrl = this.cbzService.getCoverUrl(coverData.cover, coverData.mimeType);
                    updates.hasCover = true;
                }

                // Get total pages if missing
                if (comic.totalPages === 0) {
                    try {
                        const fullData = await this.cbzService.readBDHQ(filePath);
                        updates.totalPages = fullData.pages.length;
                    } catch (error) {
                        console.warn(`Could not get page count for ${comic.title}:`, error);
                    }
                }

                this.storageService.updateComic(comic.id, updates);
                console.log(`✓ Updated comic: ${comic.title}`);
            }
        } catch (error) {
            console.error(`Error updating comic ${comic.title}:`, error);
        }
    }

    private shouldUpdateComic(comic: Comic, filePath: string): boolean {
        return !comic.hasCover || comic.totalPages === 0;
    }

    async quickScan(): Promise<number> {
        if (this.isIndexing) {
            console.log('Quick scan skipped - indexing already in progress');
            return 0;
        }

        const settings = this.settingsService.getSettings();
        if (!settings.autoIndexing) {
            console.log('Quick scan skipped - auto-indexing disabled');
            return 0;
        }

        console.log('=== STARTING QUICK SCAN ===');

        this.isIndexing = true;
        this.indexingStarted.emit();

        try {
            const sources = this.settingsService.getComicSources()
                .filter(source => source.enabled && source.type === 'directory');

            let newFiles = 0;
            const existingPaths = new Set(this.storageService.getComics().map(c => c.filePath));

            console.log(`Existing comics in library: ${existingPaths.size}`);

            for (const source of sources) {
                try {
                    console.log(`Quick scanning source: ${source.name}`);

                    const result = await this.cbzService.scanDirectory(source.path, {
                        scanSubdirectories: settings.scanSubdirectories,
                        maxDepth: settings.maxScanDepth,
                        extensions: settings.fileExtensions,
                        excludePatterns: settings.excludePatterns
                    });

                    if (result.success) {
                        console.log(`Found ${result.files.length} files in ${source.name}`);

                        for (const filePath of result.files) {
                            if (!existingPaths.has(filePath)) {
                                console.log(`New file found: ${filePath}`);
                                const comic = await this.indexFile(filePath);
                                if (comic) {
                                    newFiles++;
                                    console.log(`✓ Added new comic: ${comic.title}`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Quick scan error:', error);
                }
            }

            if (newFiles > 0) {
                console.log(`Quick scan added ${newFiles} new comics`);
                this.comicsUpdated.emit();
            } else {
                console.log('Quick scan found no new comics');
            }

            return newFiles;
        } finally {
            this.isIndexing = false;
            console.log('=== QUICK SCAN FINISHED ===');
        }
    }

    getProgress() {
        return { ...this.currentProgress };
    }

    isIndexingInProgress(): boolean {
        return this.isIndexing;
    }

    private cleanTitle(filename: string): string {
        let title = filename.replace(/\.[^/.]+$/, "");
        title = title.replace(/[_-]/g, ' ');

        const qualityPatterns = [
            /\[[^\]]*\]/g,
            /\([^)]*\)/g,
            /(\b(BD|HD|HQ|WEB|DL|DVDRIP|BLURAY|BRRIP|WEBRIP|BDRIP)\b)/gi,
            /(\b(1080p|720p|480p|2160p|4K)\b)/gi,
            /(\b(x264|x265|HEVC|AVC)\b)/gi,
            /(\b(AC3|DTS|AAC|FLAC|MP3)\b)/gi,
            /(\b(COMPLETE|SAGA|COLLECTION|VOLUME|VOL)\b)/gi,
        ];

        qualityPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        title = title.replace(/\s+/g, ' ').trim();

        title = title.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        return title || filename.replace(/\.[^/.]+$/, "");
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    private getFileExtension(filename: string): string {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }
}