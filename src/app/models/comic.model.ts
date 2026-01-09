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

export interface ComicPage {
  index: number;
  data: string;
  name: string;
  type: string;
  mimeType?: string;
}

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