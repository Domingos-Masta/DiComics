import { Injectable } from '@angular/core';
import { AppSettings, ComicSource } from '../models/comic.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_KEY = 'cbz_reader_settings';
  private readonly SOURCES_KEY = 'cbz_reader_sources';

  private defaultSettings: AppSettings = {
    autoIndexing: true,
    comicSources: [],
    scanSubdirectories: true,
    fileExtensions: ['.cbz', '.zip', '.cbr', '.rar', '.pdf'],
    maxScanDepth: 5,
    excludePatterns: ['@eaDir', '.DS_Store', 'Thumbs.db'],
    thumbnailCache: true,
    thumbnailSize: 320
  };

  getSettings(): AppSettings {
    const saved = localStorage.getItem(this.SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...this.defaultSettings, ...parsed };
    }
    return { ...this.defaultSettings };
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  updateSettings(updates: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.saveSettings(updated);
  }

  getComicSources(): ComicSource[] {
    const sourcesJson = localStorage.getItem(this.SOURCES_KEY);
    return sourcesJson ? JSON.parse(sourcesJson) : [];
  }

  saveComicSources(sources: ComicSource[]): void {
    localStorage.setItem(this.SOURCES_KEY, JSON.stringify(sources));
  }

  addComicSource(source: ComicSource): void {
    const sources = this.getComicSources();
    sources.push(source);
    this.saveComicSources(sources);
  }

  updateComicSource(sourceId: string, updates: Partial<ComicSource>): void {
    const sources = this.getComicSources();
    const index = sources.findIndex(s => s.id === sourceId);
    if (index !== -1) {
      sources[index] = { ...sources[index], ...updates };
      this.saveComicSources(sources);
    }
  }

  removeComicSource(sourceId: string): void {
    const sources = this.getComicSources().filter(s => s.id !== sourceId);
    this.saveComicSources(sources);
  }

  toggleSource(sourceId: string, enabled: boolean): void {
    this.updateComicSource(sourceId, { enabled });
  }

  resetToDefaults(): void {
    localStorage.removeItem(this.SETTINGS_KEY);
    localStorage.removeItem(this.SOURCES_KEY);
  }
}