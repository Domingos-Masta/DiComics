// comic-details.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Comic, ComicInfo, MusicGenre, ReadingMode } from '../../models/comic.model';
import { FileSizePipe } from '../../pipes/file-size-pipe';

@Component({
    selector: 'app-comic-details',
    imports: [CommonModule, FormsModule, FileSizePipe],
    templateUrl: './comic-details.component.html',
    styleUrls: ['./comic-details.component.scss']
})
export class ComicDetailsComponent implements OnInit {
    @Input() comicId?: string;

    comic?: Comic;
    editableMetadata: ComicInfo = {};

    // Reading modes
    readingModes = [
        { id: 'single' as ReadingMode, name: 'Single Page', icon: '<path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke-width="2"/>', description: 'View one page at a time' },
        { id: 'double' as ReadingMode, name: 'Double Page', icon: '<path d="M3 5a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM17 5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" stroke-width="2"/>', description: 'View two pages side by side' },
        { id: 'webtoon' as ReadingMode, name: 'Webtoon', icon: '<path d="M12 19V5M5 12h14" stroke-width="2"/>', description: 'Continuous vertical scrolling' },
        { id: 'manga' as ReadingMode, name: 'Manga', icon: '<path d="M3 6l9 4 9-4M3 6v13l9 4 9-4V6M3 6l9-4 9 4" stroke-width="2"/>', description: 'Right-to-left reading' }
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
        private router: Router
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.comicId = params['id'];
            this.loadComic();
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

    loadComic() {
        // Load comic from service
        // this.comicService.getComic(this.comicId).subscribe(comic => {
        //   this.comic = comic;
        //   this.editableMetadata = { ...comic.metadata } || {};
        //   this.loadCover();
        //   this.loadSettings();
        // });

        // For demo, create a mock comic
        this.comic = {
            id: this.comicId || '1',
            title: 'Sample Comic',
            fileName: 'sample.cbz',
            filePath: '/path/to/comic/sample.cbz',
            fileSize: 104857600, // 100MB
            totalPages: 120,
            currentPage: 45,
            isRead: false,
            hasCover: false,
            readPages: [1, 2, 3, 4, 5, 10, 20, 30, 40, 45],
            addedDate: new Date('2024-01-15'),
            lastRead: new Date('2024-01-20'),
            metadata: {
                series: 'The Amazing Series',
                issueNumber: '#1',
                publisher: 'Marvel Comics',
                year: 2024,
                writer: 'John Writer',
                penciller: 'Jane Artist',
                summary: 'An amazing comic about heroes saving the world.',
                genres: ['Superhero', 'Action'],
                tags: ['#1', 'origin'],
                rating: 4
            },
            bookmarks: [
                { comicId: this.comicId, pageNumber: 12, createdAt: new Date('2024-01-16') },
                { comicId: this.comicId, pageNumber: 45, createdAt: new Date('2024-01-20') }
            ],
            readTime: 120
        };

        this.editableMetadata = { ...(this.comic.metadata ?? {}) };
        this.generateCoverPlaceholder();
    }

    generateCoverPlaceholder() {
        const colors = ['blue', 'purple', 'red', 'green', 'yellow'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.coverPlaceholderClass = `placeholder-${color}`;

        const words = this.comic?.title?.split(' ') || [];
        this.coverInitials = words.slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join('');
    }

    onCoverError() {
        this.coverUrl = undefined;
        this.generateCoverPlaceholder();
    }

    get progressPercent(): number {
        if (!this.comic?.totalPages) return 0;
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
        // Load music playlist based on genre
        const playlists = {
            ambient: { title: 'Cosmic Ambience', artist: 'Space Sounds' },
            epic: { title: 'Heroic Journey', artist: 'Epic Orchestra' },
            chill: { title: 'Relaxing Vibes', artist: 'Chill Beats' },
            lofi: { title: 'Lofi Study', artist: 'Chillhop' },
            cinematic: { title: 'Cinematic Score', artist: 'Movie Orchestra' },
            none: undefined
        };

        this.currentTrack = playlists[genre];
    }

    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        // Implement audio playback logic
    }

    previousTrack() {
        // Go to previous track
    }

    nextTrack() {
        // Go to next track
    }

    updateVolume() {
        // Update audio volume
    }

    // Metadata Methods
    addGenre(event: Event, input: HTMLInputElement) {
        event.preventDefault();
        const value = input.value.trim();
        if (value && !this.editableMetadata.genres?.includes(value)) {
            if (!this.editableMetadata.genres) {
                this.editableMetadata.genres = [];
            }
            this.editableMetadata.genres.push(value);
            input.value = '';
        }
    }

    removeGenre(index: number) {
        this.editableMetadata.genres?.splice(index, 1);
    }

    addTag(event: Event, input: HTMLInputElement) {
        event.preventDefault();
        const value = input.value.trim();
        if (value && !this.editableMetadata.tags?.includes(value)) {
            if (!this.editableMetadata.tags) {
                this.editableMetadata.tags = [];
            }
            this.editableMetadata.tags.push(value);
            input.value = '';
        }
    }

    removeTag(index: number) {
        this.editableMetadata.tags?.splice(index, 1);
    }

    setRating(rating: number) {
        this.editableMetadata.rating = rating;
    }

    saveMetadata() {
        if (this.comic) {
            this.comic.metadata = { ...this.editableMetadata };
            // Save to service
            // this.comicService.updateComic(this.comic).subscribe();
        }
    }

    // Navigation Methods
    goBack() {
        this.router.navigate(['/']);
    }

    openReader() {
        this.router.navigate(['/reader', this.comic?.id], {
            queryParams: {
                readingMode: this.selectedReadingMode,
                musicGenre: this.selectedGenre,
                musicEnabled: this.musicEnabled,
                volume: this.volume
            }
        });
    }

    jumpToPage(page: string | number) {
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        if (this.comic && pageNum >= 1 && pageNum <= this.comic.totalPages) {
            this.comic.currentPage = pageNum;
            // Save progress
        }
    }

    resetProgress() {
        if (this.comic) {
            this.comic.currentPage = 0;
            this.comic.isRead = false;
            // Save progress
        }
    }

    removeBookmark(bookmarkId: number) {
        if (this.comic) {
            this.comic.bookmarks = this.comic.bookmarks.filter(b => b.pageNumber !== bookmarkId);
            // Save changes
        }
    }

    saveSettings() {
        // Save reading mode and music preferences
        const settings = {
            readingMode: this.selectedReadingMode,
            musicEnabled: this.musicEnabled,
            musicGenre: this.selectedGenre,
            volume: this.volume
        };
        localStorage.setItem(`comicSettings_${this.comic?.id}`, JSON.stringify(settings));
    }

    loadSettings() {
        const settingsJson = localStorage.getItem(`comicSettings_${this.comic?.id}`);
        if (settingsJson) {
            const settings = JSON.parse(settingsJson);
            this.selectedReadingMode = settings.readingMode || 'single';
            this.musicEnabled = settings.musicEnabled || false;
            this.selectedGenre = settings.musicGenre || 'ambient';
            this.volume = settings.volume || 50;
        }
    }
}