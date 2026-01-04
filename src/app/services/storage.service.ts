import { Injectable } from '@angular/core';
import { Comic, ReadingProgress } from '../models/comic.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly COMICS_KEY = 'cbz_reader_comics';
  private readonly PROGRESS_KEY = 'cbz_reader_progress';

  getComics(): Comic[] {
    const comicsJson = localStorage.getItem(this.COMICS_KEY);
    return comicsJson ? JSON.parse(comicsJson) : [];
  }

  saveComics(comics: Comic[]): void {
    localStorage.setItem(this.COMICS_KEY, JSON.stringify(comics));
  }

  addComic(comic: Comic): void {
    const comics = this.getComics();
    comics.push(comic);
    this.saveComics(comics);
  }

  updateComic(comicId: string, updates: Partial<Comic>): void {
    const comics = this.getComics();
    const index = comics.findIndex(c => c.id === comicId);
    if (index !== -1) {
      comics[index] = { ...comics[index], ...updates };
      this.saveComics(comics);
    }
  }

  getComic(comicId: string): Comic | undefined {
    return this.getComics().find(c => c.id === comicId);
  }

  deleteComic(comicId: string): void {
    const comics = this.getComics().filter(c => c.id !== comicId);
    this.saveComics(comics);
  }

  saveProgress(progress: ReadingProgress): void {
    const progresses = this.getProgresses();
    const existingIndex = progresses.findIndex(p => p.comicId === progress.comicId);
    
    if (existingIndex !== -1) {
      progresses[existingIndex] = progress;
    } else {
      progresses.push(progress);
    }
    
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progresses));
  }

  getProgress(comicId: string): ReadingProgress | undefined {
    return this.getProgresses().find(p => p.comicId === comicId);
  }

  private getProgresses(): ReadingProgress[] {
    const progressesJson = localStorage.getItem(this.PROGRESS_KEY);
    return progressesJson ? JSON.parse(progressesJson) : [];
  }
}