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

export interface ComicInfo {
    series?: string;
    web?: string;
    imprint?: string;
    languageISO?: string;
    issueNumber?: string;
    volume?: string;
    publisher?: string;
    year?: number;
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

export type ReadingMode = 'single' | 'double' | 'webtoon' | 'manga';
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