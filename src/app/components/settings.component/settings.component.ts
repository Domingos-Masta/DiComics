import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { IndexingService } from '../../services/indexing.service';
import { ComicSource, AppSettings } from '../../models/comic.model';
import { CbzService } from '../../services/cbz.service';

declare const window: any;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  @Output() settingsChanged = new EventEmitter<void>(); // Emit when settings change

  settings: AppSettings;
  sources: ComicSource[] = [];
  scanning = false;
  progress = {
    total: 0,
    processed: 0,
    currentFile: ''
  };

  // Form models
  newSourcePath = '';
  newSourceName = '';
  scanSubdirectories = true;
  maxScanDepth = 5;

  // Available file extensions
  availableExtensions = [
    { ext: '.cbz', name: 'CBZ (Comic Book ZIP)', checked: true },
    { ext: '.zip', name: 'ZIP Archive', checked: true },
    { ext: '.cbr', name: 'CBR (Comic Book RAR)', checked: true }, // Enable by default
    { ext: '.rar', name: 'RAR Archive', checked: true }, // Enable by default
    { ext: '.pdf', name: 'PDF Document', checked: false },
    { ext: '.epub', name: 'EPUB eBook', checked: false }
  ];

  constructor(
    private settingsService: SettingsService,
    private cbzService: CbzService,
    private indexingService: IndexingService,
    public router: Router
  ) {
    this.settings = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    this.loadSources();
    this.updateFormFromSettings();

    // Monitor indexing progress
    setInterval(() => {
      if (this.scanning) {
        this.progress = this.indexingService.getProgress();
      }
    }, 500);
  }

  async addSource(): Promise<void> {
    if (!this.newSourcePath) return;

    const source: ComicSource = {
      id: this.generateId(),
      path: this.newSourcePath,
      enabled: true,
      name: this.newSourceName || this.getDirectoryName(this.newSourcePath),
      lastIndexed: new Date(),
      totalComics: 0,
      type: 'directory'
    };

    this.settingsService.addComicSource(source);
    this.loadSources();

    // Clear form
    this.newSourcePath = '';
    this.newSourceName = '';
  }

  async browseDirectory(): Promise<void> {
    if (window.electronAPI?.selectDirectory) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        this.newSourcePath = path;
        if (!this.newSourceName) {
          this.newSourceName = this.getDirectoryName(path);
        }
      }
    }
  }

  removeSource(sourceId: string): void {
    if (confirm('Remove this source? Comics from this source will remain in your library.')) {
      this.settingsService.removeComicSource(sourceId);
      this.loadSources();
    }
  }

  toggleSource(sourceId: string, enabled: boolean): void {
    this.settingsService.toggleSource(sourceId, enabled);
  }

  async testSource(sourceId: string): Promise<void> {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) return;

    try {
      const result = await window.electronAPI?.getDirectoryInfo?.(source.path);
      if (result?.success) {
        alert(`Directory scan successful!\n\n` +
          `Name: ${result.name}\n` +
          `Total files: ${result.totalFiles}\n` +
          `Comic files: ${result.comicFiles}`);
      } else {
        alert('Failed to scan directory: ' + (result?.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error testing source: ' + error.message);
    }
  }

  openSourceInExplorer(sourceId: string): void {
    const source = this.sources.find(s => s.id === sourceId);
    if (source && window.electronAPI?.openDirectory) {
      window.electronAPI.openDirectory(source.path);
    }
  }

  async startIndexing(): Promise<void> {
    if (this.scanning) return;

    this.scanning = true;
    this.progress = { total: 0, processed: 0, currentFile: '' };

    try {
      const result = await this.indexingService.indexAllSources();

      // Notify parent component (Home) that indexing completed
      this.settingsChanged.emit();

      alert(`Indexing completed!\n\n` +
        `Added: ${result.added} new comics\n` +
        `Updated: ${result.updated} comics\n` +
        `Removed: ${result.removed} comics`);

    } catch (error: any) {
      alert('Indexing failed: ' + error.message);
    } finally {
      this.scanning = false;
    }
  }

  async quickScan(): Promise<void> {
    if (this.scanning) return;

    this.scanning = true;
    try {
      const newFiles = await this.indexingService.quickScan();
      if (newFiles > 0) {
        // Notify parent component (Home) that comics were updated
        this.settingsChanged.emit();
        alert(`Quick scan completed! Found ${newFiles} new comics.`);
      } else {
        alert('Quick scan completed. No new comics found.');
      }
    } catch (error: any) {
      alert('Quick scan failed: ' + error.message);
    } finally {
      this.scanning = false;
    }
  }

  saveSettings(): void {
    // Update file extensions from checkboxes
    const extensions = this.availableExtensions
      .filter(ext => ext.checked)
      .map(ext => ext.ext);

    const updatedSettings: AppSettings = {
      ...this.settings,
      autoIndexing: this.settings.autoIndexing,
      scanSubdirectories: this.scanSubdirectories,
      maxScanDepth: this.maxScanDepth,
      fileExtensions: extensions,
      excludePatterns: this.settings.excludePatterns
    };

    this.settingsService.saveSettings(updatedSettings);
    this.settings = updatedSettings;

    // Notify parent component
    this.settingsChanged.emit();

    alert('Settings saved successfully!');
  }

  resetSettings(): void {
    if (confirm('Reset all settings to defaults? This will remove all comic sources.')) {
      this.settingsService.resetToDefaults();
      this.settings = this.settingsService.getSettings();
      this.loadSources();
      this.updateFormFromSettings();
      alert('Settings reset to defaults.');
    }
  }

  private loadSources(): void {
    this.sources = this.settingsService.getComicSources();
  }

  private updateFormFromSettings(): void {
    this.scanSubdirectories = this.settings.scanSubdirectories;
    this.maxScanDepth = this.settings.maxScanDepth;

    // Update extension checkboxes
    this.availableExtensions.forEach(ext => {
      ext.checked = this.settings.fileExtensions.includes(ext.ext);
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDirectoryName(path: string): string {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || 'Unnamed Directory';
  }

  // Helper for path display
  truncatePath(path: string, maxLength: number = 50): string {
    if (path.length <= maxLength) return path;
    const half = Math.floor(maxLength / 2);
    return path.substring(0, half) + '...' + path.substring(path.length - half);
  }

  getProgressPercent(): number {
    if (this.progress.total === 0) return 0;
    return Math.round((this.progress.processed / this.progress.total) * 100);
  }

  async testComicFile(filePath: string): Promise<void> {
    try {
      const result = await this.cbzService.testComicFile(filePath);
      if (result.success) {
        alert(`Comic file test successful!\n\n` +
          `Format: ${result.type || 'unknown'}\n` +
          `Pages: ${result.totalPages}\n` +
          `Status: ${result.success ? 'OK' : 'Failed'}`);
      } else {
        alert(`Comic file test failed:\n\n${result.error}`);
      }
    } catch (error: any) {
      alert(`Error testing comic file: ${error.message}`);
    }
  }
}

// Helper function for path.basename
function pathBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}