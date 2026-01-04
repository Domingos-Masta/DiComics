import { Injectable, NgZone } from '@angular/core';
import { Comic, ComicPage, CoverPlaceholder } from '../models/comic.model';

// Define Electron API interface
declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class CbzService {
  private electronAPI = window.electronAPI;
  private isElectron = false;

  constructor(private ngZone: NgZone) {
    this.initializeElectronAPI();
  }

  private initializeElectronAPI(): void {
    // Check if we're running in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.electronAPI = window.electronAPI;
      this.isElectron = true;
      console.log('Electron API initialized successfully');
    } else {
      console.warn('Electron API not available - running in browser mode');
      this.isElectron = false;
    }
  }

  // Check if Electron API is available
  isAvailable(): boolean {
    return this.isElectron && this.electronAPI !== null;
  }

  async selectFiles(): Promise<string[]> {
    
    if (this.electronAPI) {
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

  async readCBZ(filePath: string): Promise<{pages: ComicPage[], totalPages: number}> {
    if (this.electronAPI) {
      try {
        const result = await this.electronAPI.readCBZ(filePath);
        if (result.success) {
          return {
            pages: result.pages.map((page: any, index: number) => ({
              index,
              data: page.data,
              name: page.name,
              type: page.type,
              mimeType: this.getMimeType(page.type)
            })),
            totalPages: result.totalPages
          };
        } else {
          throw new Error(result.error || 'Failed to read CBZ file');
        }
      } catch (error) {
        console.error('Error reading CBZ:', error);
        throw error;
      }
    }
    
    throw new Error('CBZ reading not available in browser mode');
  }

  async extractCover(filePath: string): Promise<{
    cover: string | null, 
    mimeType: string | null, 
    fileName?: string
  }> {    
    if (this.electronAPI) {
      try {
        const result = await this.electronAPI.extractCover(filePath);
        if (result.success) {
          return {
            cover: result.cover,
            mimeType: result.mimeType,
            fileName: result.fileName
          };
        }
      } catch (error) {
        console.error('Error extracting cover:', error);
        // Fallback to reading entire CBZ
        try {
          const fullResult = await this.readCBZ(filePath);
          if (fullResult.pages.length > 0) {
            const firstPage = fullResult.pages[0];
            return {
              cover: firstPage.data,
              mimeType: firstPage.mimeType || this.getMimeType(firstPage.type),
              fileName: firstPage.name
            };
          }
        } catch (fallbackError) {
          console.error('Fallback cover extraction failed:', fallbackError);
        }
      }
    }
    
    return { cover: null, mimeType: null };
  }

  async getFileInfo(filePath: string): Promise<any> {
    
    if (this.electronAPI) {
      try {
        console.log('Validate fiele info: ', filePath);
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
    if (this.electronAPI) {
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
    if (this.electronAPI) {
      try {
        return await this.electronAPI.countFilesInDirectory(dirPath, options);
      } catch (error: any) {
        console.error('Error counting files:', error);
        return { success: false, count: 0, error: error.message };
      }
    }
    
    return { success: false, count: 0, error: 'File counting not available' };
  }

  getImageUrl(page: ComicPage): string {
    const mimeType = page.mimeType || `image/${page.type.replace('.', '')}`;
    return `data:${mimeType};base64,${page.data}`;
  }

  getCoverUrl(coverImage: string, mimeType: string = 'image/jpeg'): string {
    return `data:${mimeType};base64,${coverImage}`;
  }

  private getMimeType(fileExtension: string): string {
    const mimeTypes: {[key: string]: string} = {
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
      input.accept = '.cbz,.zip';
      
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
}