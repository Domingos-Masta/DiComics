export interface Comic {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  coverImage?: string; // Base64 string for cover
  coverImageUrl?: string; // Data URL for display
  totalPages: number;
  currentPage: number;
  readPages: number[];
  bookmarks: Bookmarks[];
  isRead: boolean;
  lastRead: Date;
  addedDate: Date;
  fileSize: number;
  hasCover: boolean; // Flag to track if we have a cover
  metadata?: ComicInfo;
  readTime?: number; // in minutes
}

export interface Bookmarks {
  comicId?: string;
  pageNumber: number;
  createdAt: Date;
}

// {
//     "?xml": "",
//     "ComicInfo": {
//         "Series": "Shang-Chi (2021-)",
//         "Number": 7,
//         "Web": "https://www.comixology.com/Shang-Chi-2021-7/digital-comic/967852",
//         "Summary": "WHO WAS SHANG-CHI’S MOTHER? Arrows will definitely fly when we flashback to the first meeting of Shang-Chi’s parents! Who was Shang-Chi’s mother? And how did someone so virtuous and heroic fall for an evil warlord like Zheng Zu? Plus, in the present, the tides begin to turn against Shang-Chi, as the mastermind gathering all of his foes stands revealed!",
//         "Notes": "Scraped metadata from Comixology [CMXDB967852], [ASINB09G4HH93B], [RELDATE:2022-01-05]",
//         "Publisher": "Marvel",
//         "Genre": "Martial Arts, Superhero",
//         "PageCount": 21,
//         "LanguageISO": "en",
//         "ScanInformation": ""
//     }
// }

export interface ComicInfo {
    series?: string;
    web?: string;
    imprint?: string;
    languageISO?: string;
    issueNumber?: string;
    volume?: string;
    publisher?: string;
    year?: number;
    number?: number;
    month?: number;
    writer?: string;
    penciller?: string;
    colorist?: string;
    letterer?: string;
    editor?: string;
    coverArtist?: string;
    summary?: string;
    characters?: string[];
    teams?: string[];
    locations?: string[];
    genres?: string[];
    rating?: number;
    tags?: string[];
}

export type ReadingMode = 'single' | 'double' | 'webtoon' | 'manga' | 'immersive';
export type MusicGenre = 'ambient' | 'epic' | 'chill' | 'lofi' | 'cinematic' | 'none';
export type FitMode = 'width' | 'height' | 'best';

export interface ViewMode {
  id: ReadingMode;
  name: string;
  icon: string;
  description: string;
  iconSafe?: SafeHtml;
}

export interface FitModeOption {
  id: FitMode;
  name: string;
  icon: string;
}

export interface MusicGenreOption {
  id: MusicGenre;
  name: string;
  emoji: string;
}

export interface MonthOption {
  value: number;
  name: string;
}

export interface Panel {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  order?: number;
}

export interface ComicPage {
  index: number;
  data: string;
  name: string;
  type: string;
  mimeType?: string;
  panels?: Panel[];
}

// Static data constants
export const VIEW_MODES: ViewMode[] = [
  { id: 'single', name: 'Single Page', icon: '<path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="2"/>', description: 'View one page at a time' },
  { id: 'double', name: 'Double Page', icon: '<path d="M3 5a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM17 5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="2"/>', description: 'View two pages side by side' },
  { id: 'webtoon', name: 'Webtoon', icon: '<path d="M12 19V5M5 12h14" stroke="currentColor" stroke-width="2"/>', description: 'Continuous vertical scrolling' },
  { id: 'manga', name: 'Manga', icon: '<path d="M3 6l9 4 9-4M3 6v13l9 4 9-4V6M3 6l9-4 9 4" stroke="currentColor" stroke-width="2"/>', description: 'Right-to-left reading' },
  { id: 'immersive', name: 'Immersive', icon: '<path d="M3 3h7v2H5v5H3V3zm18 0v7h-2V5h-5V3h7zM3 21v-7h2v5h5v2H3zm18 0h-7v-2h5v-5h2v7z" stroke="currentColor" stroke-width="2"/>', description: 'Immersive full-screen reading with panel sequencing' }
];

export const FIT_MODES: FitModeOption[] = [
  { id: 'height', name: 'Fit Height', icon: '↕️' },
  { id: 'width', name: 'Fit Width', icon: '↔️' },
  { id: 'best', name: 'Best Fit', icon: '⬜' }
];

export const MUSIC_GENRES: MusicGenreOption[] = [
  { id: 'ambient', name: 'Ambient', emoji: '🌌' },
  { id: 'epic', name: 'Epic', emoji: '⚔️' },
  { id: 'chill', name: 'Chill', emoji: '🌿' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '☕' },
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'none', name: 'None', emoji: '🔇' }
];

export const MONTHS: MonthOption[] = [
  { value: 1, name: 'January' }, { value: 2, name: 'February' },
  { value: 3, name: 'March' }, { value: 4, name: 'April' },
  { value: 5, name: 'May' }, { value: 6, name: 'June' },
  { value: 7, name: 'July' }, { value: 8, name: 'August' },
  { value: 9, name: 'September' }, { value: 10, name: 'October' },
  { value: 11, name: 'November' }, { value: 12, name: 'December' }
];

// Import SafeHtml type for icon safety
import { SafeHtml } from '@angular/platform-browser';

export interface ReadingProgress {
  comicId: string;
  currentPage: number;
  readPages: number[];
  bookmarks: Bookmarks[];
  lastRead: Date;
  isComplete: boolean;
}

export interface CoverPlaceholder {
  color: string;
  initials: string;
}

export interface ComicSource {
  id: string;
  path: string;
  enabled: boolean;
  name: string;
  lastIndexed: Date;
  totalComics: number;
  type: 'directory' | 'file';
}

export interface AppSettings {
  autoIndexing: boolean;
  comicSources: ComicSource[];
  scanSubdirectories: boolean;
  fileExtensions: string[];
  maxScanDepth: number;
  excludePatterns: string[];
  thumbnailCache: boolean;
  thumbnailSize: number;
}