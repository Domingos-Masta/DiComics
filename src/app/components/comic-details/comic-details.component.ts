// comic-details.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Comic, ComicInfo, MusicGenre, ReadingMode } from '../../models/comic.model';
import { FileSizePipe } from '../../pipes/file-size-pipe';
import { StorageService } from '../../services/storage.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-comic-details',
  imports: [CommonModule, FormsModule, FileSizePipe],
  templateUrl: './comic-details.component.html',
  styleUrls: ['./comic-details.component.scss']
})
export class ComicDetailsComponent implements OnInit, OnDestroy {
  @Input() comic?: Comic;
  @Input() comicId?: string;

  editableMetadata: ComicInfo = {};

  // Reading modes
  readingModes = [
    { id: 'single' as ReadingMode, name: 'Single Page', icon: '<path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="2"/>', description: 'View one page at a time', iconSafe: '' as SafeHtml },
    { id: 'double' as ReadingMode, name: 'Double Page', icon: '<path d="M3 5a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM17 5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="2"/>', description: 'View two pages side by side' , iconSafe: '' as SafeHtml },
    { id: 'webtoon' as ReadingMode, name: 'Webtoon', icon: '<path d="M12 19V5M5 12h14" stroke="currentColor" stroke-width="2"/>', description: 'Continuous vertical scrolling', iconSafe: '' as SafeHtml },
    { id: 'manga' as ReadingMode, name: 'Manga', icon: '<path d="M3 6l9 4 9-4M3 6v13l9 4 9-4V6M3 6l9-4 9 4" stroke="currentColor" stroke-width="2"/>', description: 'Right-to-left reading', iconSafe: '' as SafeHtml },
    { id: 'immersive' as ReadingMode, name: 'Immersive', icon: '<path d="M3 3h7v2H5v5H3V3zm18 0v7h-2V5h-5V3h7zM3 21v-7h2v5h5v2H3zm18 0h-7v-2h5v-5h2v7z" stroke="currentColor" stroke-width="2"/>', description: 'Immersive full-screen reading', iconSafe: '' as SafeHtml }
  ];

  selectedReadingMode: ReadingMode = 'single';

  // Music settings
  musicEnabled = false;
  musicGenres = [
    { id: 'ambient' as MusicGenre, name: 'Ambient', emoji: '🌌' },
    { id: 'epic' as MusicGenre, name: 'Epic', emoji: '⚔️' },
    { id: 'chill' as MusicGenre, name: 'Chill', emoji: '🌿' },
    { id: 'lofi' as MusicGenre, name: 'Lo-Fi', emoji: '☕' },
    { id: 'cinematic' as MusicGenre, name: 'Cinematic', emoji: '🎬' },
    { id: 'none' as MusicGenre, name: 'None', emoji: '🔇' }
  ];

  selectedGenre: MusicGenre = 'ambient';
  isPlaying = false;
  volume = 50;
  currentTrack?: { title: string; artist: string; };

  // Months for dropdown
  months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  coverUrl?: string;
  coverPlaceholderClass = '';
  coverInitials = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storageService: StorageService
    , private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.sanitizeModeIcons();
    // If comic is passed via @Input, use it
    if (this.comic) {
      this.initializeComic();
      return;
    }

    // Otherwise, try to load from route params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.comicId = params['id'];
        this.loadComicFromStorage();
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['readingMode']) {
        this.selectedReadingMode = params['readingMode'] as ReadingMode;
      }
      if (params['musicGenre']) {
        this.selectedGenre = params['musicGenre'] as MusicGenre;
        this.musicEnabled = this.selectedGenre !== 'none';
      }
    });
  }

  private sanitizeModeIcons() {
    this.readingModes = this.readingModes.map(mode => ({
      ...mode,
      iconSafe: this.sanitizer.bypassSecurityTrustHtml(mode.icon) as SafeHtml
    }));
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private loadComicFromStorage() {
    if (!this.comicId) return;
    
    const comics = this.storageService.getComics();
    const found = comics.find(c => c.id === this.comicId);
    
    if (found) {
      this.comic = found;
       console.log('Comic info: ', this.comic);
      this.initializeComic();
    } else {
      console.error(`Comic not found: ${this.comicId}`);
      this.router.navigate(['/']);
    }
  }

  private initializeComic() {
    if (!this.comic) return;

    this.editableMetadata = { ...(this.comic.metadata ?? {}) };

    // Normalize genres: accept either array or comma-separated string
    const rawGenres: any = (this.editableMetadata as any).genre || (this.editableMetadata as any).genres;
    if (rawGenres && typeof rawGenres === 'string') {
      this.editableMetadata.genres = rawGenres.split(',').map((s: string) => s.trim()).filter((s: string) => !!s);
    } else if (Array.isArray(rawGenres)) {
      this.editableMetadata.genres = rawGenres.map(g => String(g).trim()).filter(g => !!g);
    } else if (!this.editableMetadata.genres) {
      this.editableMetadata.genres = [];
    }

    // If issue number contains digits, expose a numeric parsed value
    this.issueNumberParsed = null;
    if (this.editableMetadata.number) {
      const match = String(this.editableMetadata.number).match(/(\d+)/);
      if (match) {
        this.issueNumberParsed = parseInt(match[1], 10);
      }
    }

    this.generateCoverPlaceholder();
    this.loadSettings();
  }

  generateCoverPlaceholder() {
    if (!this.comic) return;

    const colors = ['blue', 'purple', 'red', 'green', 'yellow'];
    const colorIndex = this.comic.id.charCodeAt(0) % colors.length;
    this.coverPlaceholderClass = `placeholder-${colors[colorIndex]}`;

    const words = this.comic.title?.split(' ') || [];
    this.coverInitials = words.slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3);

    // Set cover URL if available
    if (this.comic.coverImageUrl) {
      this.coverUrl = this.comic.coverImageUrl;
    }
  }

  // Parsed numeric issue value (if any)
  issueNumberParsed: number | null = null;

  // Genre helpers for chips
  addGenre(event: Event, input: HTMLInputElement) {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    if (!this.editableMetadata.genres) this.editableMetadata.genres = [];
    if (!this.editableMetadata.genres.includes(value)) {
      this.editableMetadata.genres.push(value);
    }
    input.value = '';
  }

  removeGenre(index: number) {
    if (!this.editableMetadata.genres) return;
    this.editableMetadata.genres.splice(index, 1);
  }

  updateIssueNumberFromParsed() {
    if (this.issueNumberParsed == null) return;
    this.editableMetadata.issueNumber = String(this.issueNumberParsed);
  }

  onCoverError() {
    this.coverUrl = undefined;
  }

  get progressPercent(): number {
    if (!this.comic?.totalPages || this.comic.totalPages === 0) return 0;
    return ((this.comic.currentPage || 0) / this.comic.totalPages) * 100;
  }

  // Reading Mode Methods
  selectReadingMode(mode: ReadingMode) {
    this.selectedReadingMode = mode;
    this.saveSettings();
  }

  // Music Methods
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.selectedGenre = 'none';
    }
    this.saveSettings();
  }

  selectGenre(genre: MusicGenre) {
    this.selectedGenre = genre;
    if (genre === 'none') {
      this.musicEnabled = false;
    } else {
      this.musicEnabled = true;
      this.loadPlaylist(genre);
    }
    this.saveSettings();
  }

  loadPlaylist(genre: MusicGenre) {
    const playlists: Record<MusicGenre, { title: string; artist: string } | undefined> = {
      ambient: { title: 'Cosmic Ambience', artist: 'Space Sounds' },
      epic: { title: 'Heroic Journey', artist: 'Epic Orchestra' },
      chill: { title: 'Relaxing Vibes', artist: 'Chill Beats' },
      lofi: { title: 'Lofi Study', artist: 'Chillhop' },
      cinematic: { title: 'Cinematic Score', artist: 'Movie Orchestra' },
      none: undefined
    };

    this.currentTrack = playlists[genre] || undefined;
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
  }

  previousTrack() {
    // Go to previous track
  }

  nextTrack() {
    // Go to next track
  }

  updateVolume() {
    // Update audio volume
    this.saveSettings();
  }

  // Metadata Methods
  setRating(rating: number) {
    this.editableMetadata.rating = rating;
  }

  saveMetadata() {
    if (this.comic) {
      this.comic.metadata = { ...this.editableMetadata };
      this.storageService.updateComic(this.comic.id, { metadata: this.comic.metadata });
    }
  }

  // Navigation Methods
  goBack() {
    this.router.navigate(['/']);
  }

  openReader() {
    if (!this.comic) return;
    
    this.router.navigate(['/reader', this.comic.id], {
      queryParams: {
        readingMode: this.selectedReadingMode,
        musicGenre: this.selectedGenre,
        musicEnabled: this.musicEnabled,
        volume: this.volume
      }
    });
  }

  jumpToPage(page: string | number) {
    if (!this.comic) return;
    
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNum >= 1 && pageNum <= this.comic.totalPages) {
      this.comic.currentPage = pageNum;
      this.storageService.updateComic(this.comic.id, { currentPage: pageNum });
    }
  }

  resetProgress() {
    if (!this.comic) return;
    
    this.comic.currentPage = 0;
    this.comic.isRead = false;
    this.storageService.updateComic(this.comic.id, {
      currentPage: 0,
      isRead: false
    });
  }

  removeBookmark(pageNumber: number) {
    if (!this.comic) return;
    
    this.comic.bookmarks = this.comic.bookmarks.filter(b => b.pageNumber !== pageNumber);
    this.storageService.updateComic(this.comic.id, { bookmarks: this.comic.bookmarks });
  }

  saveSettings() {
    if (!this.comic) return;
    
    const settings = {
      readingMode: this.selectedReadingMode,
      musicEnabled: this.musicEnabled,
      musicGenre: this.selectedGenre,
      volume: this.volume
    };
    localStorage.setItem(`comicSettings_${this.comic.id}`, JSON.stringify(settings));
  }

  loadSettings() {
    if (!this.comic) return;
    
    const settingsJson = localStorage.getItem(`comicSettings_${this.comic.id}`);
    if (settingsJson) {
      try {
        const settings = JSON.parse(settingsJson);
        this.selectedReadingMode = settings.readingMode || 'single';
        this.musicEnabled = settings.musicEnabled || false;
        this.selectedGenre = settings.musicGenre || 'ambient';
        this.volume = settings.volume || 50;
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }
}