import { Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SplashComponent } from './components/splash/splash.component';
import { IndexingService } from './services/indexing.service';
import { SettingsService } from './services/settings.service';
import { filter } from 'rxjs/internal/operators/filter';
import { CbzService } from './services/cbz.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, SplashComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {
  showSplash = true;
  protected readonly title = signal('bdhq-reader');
constructor(
    private indexingService: IndexingService,
    private settingsService: SettingsService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('AppComponent initializing...');
    
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
}
