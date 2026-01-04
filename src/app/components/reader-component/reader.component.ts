import { Component, OnInit, OnDestroy, HostListener, AfterViewInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CbzService } from '../../services/cbz.service';
import { StorageService } from '../../services/storage.service';
import { Comic, ComicPage, ReadingProgress } from '../../models/comic.model';

@Component({
  selector: 'app-reader',
  imports: [CommonModule, FormsModule],
  templateUrl: './reader.component.html',
  styleUrls: ['./reader.component.scss']
})
export class ReaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pageViewer') pageViewer!: ElementRef;
  @ViewChild('pageImage') pageImage!: ElementRef;

  comicId: string = '';
  comic?: Comic;
  pages: ComicPage[] = [];
  currentPageIndex: number = 0;
  loading: boolean = true;
  showControls: boolean = true;
  showSidebar: boolean = false;
  showThumbnails: boolean = false;
  showBookmarks: boolean = false;
  fullscreen: boolean = false;
  zoomLevel: number = 100;
  fitMode: 'width' | 'height' | 'best' = 'height';
  readingMode: 'single' | 'double' = 'single';
  controlsTimeout: any;
  sidebarTimeout: any;

  // View modes
  viewModes = [
    { id: 'single', name: 'Single Page', icon: '📄' },
    { id: 'double', name: 'Double Page', icon: '📖' }
  ];

  // Fit modes
  fitModes = [
    { id: 'height', name: 'Fit Height', icon: '↕️' },
    { id: 'width', name: 'Fit Width', icon: '↔️' },
    { id: 'best', name: 'Best Fit', icon: '⬜' }
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private cbzService: CbzService,
    private storageService: StorageService,
    private renderer: Renderer2
  ) { }

  async ngOnInit(): Promise<void> {
    this.comicId = this.route.snapshot.paramMap.get('id') || '';
    await this.loadComic();

    if (this.comic) {
      await this.loadPages();
      this.restoreProgress();
    }

    this.resetControlsTimer();
  }

  ngAfterViewInit(): void {
    this.applyZoom();
    this.applyFitMode();
  }

  ngOnDestroy(): void {
    this.saveProgress();
    this.clearTimeouts();
  }

  clearTimeouts(): void {
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    if (this.sidebarTimeout) clearTimeout(this.sidebarTimeout);
  }

  private async loadComic(): Promise<void> {
    this.comic = this.storageService.getComic(this.comicId);
    if (!this.comic) {
      this.router.navigate(['/']);
    }
  }

  private async loadPages(): Promise<void> {
    if (!this.comic) return;

    this.loading = true;
    try {
      const result = await this.cbzService.readCBZ(this.comic.filePath);
      this.pages = result.pages;

      if (this.comic.totalPages !== result.totalPages) {
        this.comic.totalPages = result.totalPages;
        this.storageService.updateComic(this.comic.id, { totalPages: result.totalPages });
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      alert('Error loading comic pages');
    } finally {
      this.loading = false;
      setTimeout(() => this.applyFitMode(), 100);
    }
  }

  private restoreProgress(): void {
    if (!this.comic) return;

    const progress = this.storageService.getProgress(this.comic.id);
    if (progress) {
      this.currentPageIndex = Math.max(0, Math.min(progress.currentPage, this.pages.length - 1));
      this.comic.readPages = progress.readPages;
      this.comic.bookmarks = progress.bookmarks;
    }
  }

  private saveProgress(): void {
    if (!this.comic) return;

    const progress: ReadingProgress = {
      comicId: this.comic.id,
      currentPage: this.currentPageIndex,
      readPages: this.comic.readPages,
      bookmarks: this.comic.bookmarks,
      lastRead: new Date(),
      isComplete: this.comic.readPages.length === this.pages.length
    };

    this.storageService.saveProgress(progress);

    this.comic.currentPage = this.currentPageIndex;
    this.comic.isRead = progress.isComplete;
    this.comic.lastRead = new Date();
    this.storageService.updateComic(this.comic.id, {
      currentPage: this.currentPageIndex,
      isRead: progress.isComplete,
      lastRead: new Date()
    });
  }

  get currentPage(): ComicPage | undefined {
    return this.pages[this.currentPageIndex];
  }

  get nextPage(): ComicPage | undefined {
    return this.pages[this.currentPageIndex + 1];
  }

  getImageUrl(page: ComicPage): string {
    return this.cbzService.getImageUrl(page);
  }

  nextPages(): void {
    if (this.currentPageIndex < this.pages.length - 1) {
      const increment = this.readingMode === 'double' ? 2 : 1;
      this.currentPageIndex = Math.min(this.currentPageIndex + increment, this.pages.length - 1);
      this.markPageAsRead(this.currentPageIndex);
      this.saveProgress();
      this.scrollToTop();
    }
  }

  previousPage(): void {
    if (this.currentPageIndex > 0) {
      const decrement = this.readingMode === 'double' ? 2 : 1;
      this.currentPageIndex = Math.max(0, this.currentPageIndex - decrement);
      this.markPageAsRead(this.currentPageIndex);
      this.saveProgress();
      this.scrollToTop();
    }
  }

  goToPage(pageIndexEvent: any): void {
    const pageIndex = (pageIndexEvent.target as HTMLInputElement).valueAsNumber;
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.currentPageIndex = pageIndex;
      this.markPageAsRead(pageIndex);
      this.saveProgress();
      this.scrollToTop();
      this.hideSidebar();
    }
  }

  markPageAsRead(pageIndex: number): void {
    if (!this.comic) return;

    if (!this.comic.readPages.includes(pageIndex)) {
      this.comic.readPages.push(pageIndex);
      this.comic.readPages.sort((a, b) => a - b);
    }
  }

  toggleBookmark(): void {
    if (!this.comic) return;

    const index = this.comic.bookmarks.indexOf(this.currentPageIndex);
    if (index === -1) {
      this.comic.bookmarks.push(this.currentPageIndex);
      this.comic.bookmarks.sort((a, b) => a - b);
    } else {
      this.comic.bookmarks.splice(index, 1);
    }
    this.saveProgress();
  }

  isBookmarked(): boolean {
    return this.comic?.bookmarks.includes(this.currentPageIndex) || false;
  }

  isPageRead(pageIndex: number): boolean {
    return this.comic?.readPages.includes(pageIndex) || false;
  }

  markAllAsRead(): void {
    if (!this.comic) return;

    this.comic.readPages = Array.from({ length: this.pages.length }, (_, i) => i);
    this.saveProgress();
  }

  goToBookmark(pageIndex: number): void {
    this.goToPage(pageIndex);
  }

  toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;
    if (this.fullscreen) {
      this.renderer.addClass(document.body, 'fullscreen');
    } else {
      this.renderer.removeClass(document.body, 'fullscreen');
    }
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 25, 400);
    this.applyZoom();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 25, 25);
    this.applyZoom();
  }

  resetZoom(): void {
    this.zoomLevel = 100;
    this.applyZoom();
  }

  private applyZoom(): void {
    if (this.pageImage?.nativeElement) {
      this.pageImage.nativeElement.style.transform = `scale(${this.zoomLevel / 100})`;
    }
  }

  setFitMode(mode: 'width' | 'height' | 'best' | any): void {
    this.fitMode = mode;
    this.applyFitMode();
  }

  private applyFitMode(): void {
    if (!this.pageImage?.nativeElement || !this.pageViewer?.nativeElement) return;

    const viewer = this.pageViewer.nativeElement;
    const img = this.pageImage.nativeElement;

    switch (this.fitMode) {
      case 'width':
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        break;
      case 'height':
        img.style.width = 'auto';
        img.style.height = '100%';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        break;
      case 'best':
        img.style.maxWidth = 'auto';
        img.style.maxHeight = 'auto';
        img.style.width = '150%';
        img.style.height = 'auto';
        break;
      default:
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.width = 'auto';
        img.style.height = 'auto';
        break;
    }
  }

  setReadingMode(mode: 'single' | 'double' | any): void {
    this.readingMode = mode;
  }

  toggleControls(): void {
    this.showControls = !this.showControls;
    if (this.showControls) {
      this.resetControlsTimer();
    }
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
    if (this.showSidebar) {
      this.showThumbnails = true;
      this.showBookmarks = false;
    }
  }

  toggleThumbnails(): void {
    this.showThumbnails = !this.showThumbnails;
    this.showBookmarks = !this.showThumbnails;
    this.showSidebar = this.showThumbnails || this.showBookmarks;
  }

  toggleBookmarksPanel(): void {
    this.showBookmarks = !this.showBookmarks;
    this.showThumbnails = !this.showBookmarks;
    this.showSidebar = this.showThumbnails || this.showBookmarks;
  }

  hideSidebar(): void {
    this.showSidebar = false;
    this.showThumbnails = false;
    this.showBookmarks = false;
  }

  resetControlsTimer(): void {
    this.clearTimeouts();
    this.controlsTimeout = setTimeout(() => {
      this.showControls = false;
    }, 3000);
  }

  scrollToTop(): void {
    if (this.pageViewer?.nativeElement) {
      this.pageViewer.nativeElement.scrollTop = 0;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    this.resetControlsTimer();

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        event.preventDefault();
        this.nextPages();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previousPage();
        break;
      case 'b':
        event.preventDefault();
        this.toggleBookmark();
        break;
      case 'Escape':
        if (this.fullscreen) {
          this.toggleFullscreen();
        } else if (this.showSidebar) {
          this.hideSidebar();
        } else {
          this.router.navigate(['/']);
        }
        break;
      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 't':
        event.preventDefault();
        this.toggleSidebar();
        break;
      case '=':
      case '+':
        event.preventDefault();
        this.zoomIn();
        break;
      case '-':
        event.preventDefault();
        this.zoomOut();
        break;
      case '0':
        event.preventDefault();
        this.resetZoom();
        break;
      case '1':
        event.preventDefault();
        this.setFitMode('best');
        break;
      case '2':
        event.preventDefault();
        this.setFitMode('width');
        break;
      case '3':
        event.preventDefault();
        this.setFitMode('height');
        break;
    }
  }

  @HostListener('click')
  onClick(): void {
    this.resetControlsTimer();
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  }

  getProgressPercent(): number {
    if (!this.comic || this.pages.length === 0) return 0;
    return Math.round((this.comic.readPages.length / this.pages.length) * 100);
  }

}