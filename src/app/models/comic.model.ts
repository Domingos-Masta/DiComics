export interface Comic {
  id: string;
  title: string;
  filePath: string;
  coverImage?: string; // Base64 string for cover
  coverImageUrl?: string; // Data URL for display
  totalPages: number;
  currentPage: number;
  readPages: number[];
  bookmarks: number[];
  isRead: boolean;
  lastRead: Date;
  addedDate: Date;
  fileSize: number;
  hasCover: boolean; // Flag to track if we have a cover
}

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
  bookmarks: number[];
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