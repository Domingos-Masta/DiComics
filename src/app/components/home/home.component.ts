import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CbzService } from '../../services/cbz.service';
import { StorageService } from '../../services/storage.service';
import { IndexingService } from '../../services/indexing.service';
import { SettingsService } from '../../services/settings.service';
import { Comic, CoverPlaceholder } from '../../models/comic.model';
import { FileSizePipe } from '../../pipes/file-size-pipe';
import { AboutComponent } from '../about/about.component';

// Helper function to access electron in a type-safe way if using contextIsolation
const ipcRenderer = (window as any).ipcRenderer;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, FileSizePipe, AboutComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  comics: Comic[] = [];
  filteredComics: Comic[] = [];
  loading = false;
  indexing = false;
  aboutDialogOpen = false;
  searchQuery = '';
  sortBy: 'name' | 'date' | 'progress' = 'date';
  filterBy: 'all' | 'reading' | 'unread' | 'completed' = 'all';
  contextMenu = {
    comic: null as any,
    x: 0,
    y: 0,
    visible: false
  };

  // Indexing progress
  indexingProgress = {
    total: 0,
    processed: 0,
    currentFile: '',
    currentSource: '',
    percent: 0
  };

  // Cover extraction
  coversLoading = new Set<string>();
  coverPlaceholders = new Map<string, CoverPlaceholder>();

  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private ngZone: NgZone,
    private cbzService: CbzService,
    private storageService: StorageService,
    private indexingService: IndexingService,
    private settingsService: SettingsService,
    public router: Router
  ) { }

  ngOnInit(): void {
    console.log('HomeComponent initializing...');
    console.log('CbzService available:', this.cbzService.isAvailable());

    this.loadComics();
    this.preloadCovers();
    this.setupIndexingListeners();

    // Perform quick scan on startup if enabled
    const settings = this.settingsService.getSettings();
    console.log('Auto-indexing setting:', settings.autoIndexing);

    if (settings.autoIndexing && this.cbzService.isAvailable()) {
      console.log('Performing quick scan...');
      this.performQuickScan();
    } else {
      console.log('Quick scan skipped - either disabled or Electron API not available');
    }

    if ((window as any).electronAPI) {
      (window as any).electronAPI.onOpenAboutModal(() => {
        this.ngZone.run(() => {
          this.openOnChangeAboutDialog();
        });
      });
      (window as any).electronAPI.handleFileOpen(async (filePath: string) => {
        this.ngZone.run(async () => {
          if (filePath) {
            console.log('Received file to open:', filePath);
            try {
              const comic = await this.indexingService.indexFile(filePath);
              if (comic) {
                this.generatePlaceholder(comic);
                this.loadComics();
                this.showNotification(`Added "${comic.title}" to library`, 'success');
              } else {
                this.showNotification('File is already in your library.', 'info');
              }
            } catch (error) {
              console.error('Error indexing file from open-file event:', error);
              this.showNotification('Error adding file to library. Please try again.', 'error');
            }
          }
        });
      });
    }
  }

  ngOnDestroy(): void {
    this.coversLoading.clear();
  }

  private setupIndexingListeners(): void {
    // Listen for indexing events
    this.indexingService.indexingStarted.subscribe(() => {
      this.indexing = true;
      this.indexingProgress = { total: 0, processed: 0, currentFile: '', percent: 0, currentSource: '' };
    });

    this.indexingService.indexingProgress.subscribe(progress => {
      this.indexingProgress = {
        ...progress,
        percent: progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
      };
    });

    this.indexingService.indexingCompleted.subscribe(result => {
      this.indexing = false;
      this.showNotification(
        `Indexing completed! Added: ${result.added}, Updated: ${result.updated}, Removed: ${result.removed}`,
        'success'
      );
      this.loadComics(); // Reload comics after indexing
    });

    this.indexingService.indexingError.subscribe(error => {
      this.indexing = false;
      this.showNotification(`Indexing error: ${error.message}`, 'error');
    });

    this.indexingService.comicsUpdated.subscribe(() => {
      this.loadComics(); // Reload when comics are updated
    });
  }

  private async performQuickScan(): Promise<void> {
    try {
      const newFiles = await this.indexingService.quickScan();
      if (newFiles > 0) {
        this.showNotification(`Found ${newFiles} new comics during quick scan`, 'success');
      }
    } catch (error) {
      console.error('Quick scan failed:', error);
    }
  }

  async uploadFiles(): Promise<void> {
    this.loading = true;
    try {
      const filePaths = await this.cbzService.selectFiles();

      const fileInfo = await this.cbzService.getFileInfo(filePaths[0]);
      console.log('This file Info:', filePaths);
      console.log('This file Info:', fileInfo);

      const existingPaths = this.comics.map(c => c.filePath);
      const newPaths = filePaths.filter(path => !existingPaths.includes(path));

      if (newPaths.length === 0) {
        this.showNotification('All selected comics are already in your library.', 'info');
        this.loading = false;
        return;
      }

      let addedCount = 0;

      for (const filePath of newPaths) {
        const comic = await this.indexingService.indexFile(filePath);
        if (comic) {
          addedCount++;
          this.generatePlaceholder(comic);
        }
      }

      if (addedCount > 0) {
        this.showNotification(`Added ${addedCount} new comics to library`, 'success');
        this.loadComics(); // Reload comics
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      this.showNotification('Error uploading files. Please try again.', 'error');
    } finally {
      this.loading = false;
    }
  }

  openComic(comic: Comic): void {
    this.router.navigate(['/reader', comic.id]);
  }

  getProgress(comic: Comic): number {
    return comic.readPages.length;
  }

  getProgressPercent(comic: Comic): number {
    return comic.totalPages > 0 ? (comic.readPages.length / comic.totalPages) * 100 : 0;
  }

  getCoverStyle(comic: Comic): any {
    if (comic.coverImageUrl) {
      return {
        'background-image': `url('${comic.coverImageUrl}')`,
        'background-size': 'cover',
        'background-position': 'center'
      };
    }
    return {};
  }

  hasCover(comic: Comic): boolean {
    return comic.hasCover && !!comic.coverImageUrl;
  }

  getCoverPlaceholder(comic: Comic): CoverPlaceholder | undefined {
    return this.coverPlaceholders.get(comic.id);
  }

  generatePlaceholder(comic: Comic): void {
    if (!this.coverPlaceholders.has(comic.id)) {
      const placeholder = this.cbzService.generatePlaceholder(comic);
      this.coverPlaceholders.set(comic.id, placeholder);
    }
  }

  async retryCoverExtraction(comic: Comic, event: Event): Promise<void> {
    event.stopPropagation();

    if (this.coversLoading.has(comic.id)) {
      return;
    }

    this.coversLoading.add(comic.id);

    try {
      const coverData = await this.cbzService.extractCover(comic.filePath);

      if (coverData.cover && coverData.mimeType) {
        comic.coverImage = coverData.cover;
        comic.coverImageUrl = this.cbzService.getCoverUrl(coverData.cover, coverData.mimeType);
        comic.hasCover = true;

        this.storageService.updateComic(comic.id, {
          coverImage: comic.coverImage,
          coverImageUrl: comic.coverImageUrl,
          hasCover: true
        });

        this.showNotification('Cover extracted successfully!', 'success');
        this.loadComics(); // Reload to show new cover
      } else {
        this.showNotification('No valid cover image found in file', 'error');
      }
    } catch (error) {
      console.error('Failed to extract cover:', error);
      this.showNotification('Failed to extract cover image. The comic may be corrupted.', 'error');
    } finally {
      this.coversLoading.delete(comic.id);
    }
  }

  private preloadCovers(): void {
    this.comics.forEach(comic => this.generatePlaceholder(comic));
  }

  markAsRead(comic: Comic, event: Event): void {
    event.stopPropagation();
    comic.isRead = !comic.isRead;
    this.storageService.updateComic(comic.id, { isRead: comic.isRead });
    this.applyFilters();
    this.showNotification(comic.isRead ? 'Marked as read' : 'Marked as unread', 'success');
  }

  deleteComic(comic: Comic, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete "${comic.title}" from your library?`)) {
      this.storageService.deleteComic(comic.id);
      this.coverPlaceholders.delete(comic.id);
      this.loadComics();
      this.showNotification('Comic deleted from library', 'success');
    }
  }

  sortComics(): void {
    this.filteredComics.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        case 'progress':
          return this.getProgressPercent(b) - this.getProgressPercent(a);
        default:
          return 0;
      }
    });
  }

  applyFilters(): void {
    this.filteredComics = this.comics.filter(comic => {
      const matchesSearch = comic.title.toLowerCase().includes(this.searchQuery.toLowerCase());

      let matchesStatus = true;
      switch (this.filterBy) {
        case 'reading':
          matchesStatus = !comic.isRead && comic.readPages.length > 0;
          break;
        case 'unread':
          matchesStatus = !comic.isRead && comic.readPages.length === 0;
          break;
        case 'completed':
          matchesStatus = comic.isRead;
          break;
      }

      return matchesSearch && matchesStatus;
    });

    this.sortComics();
  }

  private loadComics(): void {
    console.log('Loading comics from storage...');
    this.comics = this.storageService.getComics();
    console.log(`Found ${this.comics.length} comics in storage`);
    console.log('Comics:', this.comics);

    this.applyFilters();
    console.log(`Filtered to ${this.filteredComics.length} comics`);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.showToast = false;
    }, 5000);
  }

  // Add manual refresh method
  refreshLibrary(): void {
    this.loadComics();
    this.showNotification('Library refreshed', 'info');
  }

  // Add manual indexing trigger
  async triggerIndexing(): Promise<void> {
    if (this.indexing) {
      this.showNotification('Indexing already in progress', 'info');
      return;
    }

    try {
      await this.indexingService.indexAllSources();
    } catch (error) {
      this.showNotification('Failed to start indexing', 'error');
    }
  }

  openOnChangeAboutDialog(status = true): void {
    this.aboutDialogOpen = status;
  }

  // Add cancelIndexing method
  cancelIndexing(): void {
    // This is a simple cancellation - we'll just hide the modal
    // In a real app, you'd want to properly cancel the indexing process
    this.indexing = false;
    this.showNotification('Indexing cancelled', 'info');
  }

  // Additional methods for context menu actions
  openContextMenu(event: MouseEvent, comic: any) {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenu.comic = comic;
    this.contextMenu.x = event.clientX;
    this.contextMenu.y = event.clientY;
    this.contextMenu.visible = true;
  }

  openComicFolder(comic: Comic, event: Event) {
    event.stopPropagation();
    this.closeContextMenu();
    const filePath = comic.filePath.replace(comic.fileName, '');
    this.cbzService.openFolder(filePath);
  }

  closeContextMenu() {
    this.contextMenu.comic = null;
    this.contextMenu.visible = false;
  }

  openComicDetails(comic: any) {
    this.closeContextMenu();
    this.router.navigate(['/comic', comic.id]);
  }

  quickEditMetadata(comic: any) {
    this.closeContextMenu();
    // Open quick edit modal or navigate
  }

  setReadingMode(comic: any) {
    this.closeContextMenu();
    // Open reading mode selector
  }

}