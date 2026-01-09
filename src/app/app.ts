import { Component, NgZone, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { SplashComponent } from './components/splash/splash.component';
import { IndexingService } from './services/indexing.service';
import { SettingsService } from './services/settings.service';
import { filter } from 'rxjs/internal/operators/filter';
import { CbzService } from './services/cbz.service';
// Helper function to access electron in a type-safe way if using contextIsolation
const ipcRenderer = (window as any).ipcRenderer;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {
  showSplash = true;
  filePath: string | null = null;
  protected readonly title = signal('dicomics');
  constructor(
    private ngZone: NgZone,
    private indexingService: IndexingService,
    private settingsService: SettingsService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    console.log('AppComponent initializing...');
    await this.onReceiveExternalFile();

    // Show splash for 3 seconds
    setTimeout(async () => {
      this.showSplash = false;

      // Auto-index if enabled
      const settings = this.settingsService.getSettings();
      console.log('Auto-indexing setting:', settings.autoIndexing);

      if (settings.autoIndexing) {
        console.log('Starting auto-indexing...');
        setTimeout(() => this.performAutoIndexing(), 1000);
      }
    }, 3000);

    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      console.log('Route changed to:', this.router.url);
    });
  }

  private async performAutoIndexing(): Promise<void> {
    try {
      console.log('Performing auto-indexing...');
      const newFiles = await this.indexingService.quickScan();
      console.log(`Auto-indexing completed. Found ${newFiles} new comics.`);
    } catch (error) {
      console.error('Auto-indexing failed:', error);
    }
  }

  async onReceiveExternalFile(): Promise<void> {
    // Placeholder for handling external file reception
    return (window as any).electronAPI.handleFileOpen(async (filePath: string) => {
      this.ngZone.run(async () => {
        if (filePath) {
          console.log('Received file to open:', filePath);
          this.filePath = filePath;
        } else {
          console.log('No file path received.');
        }
      });
    });
  }
}
