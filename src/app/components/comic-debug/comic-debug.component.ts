import { Component } from '@angular/core';
import { CbzService } from '../../services/cbz.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-comic-debug.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './comic-debug.component.html',
  styleUrl: './comic-debug.component.scss',
})
export class ComicDebugComponent {
  testFilePath = '';
  testResult: any = null;
  supportedFormats: any = null;

  constructor(private cbzService: CbzService) { }

  async browseFile(): Promise<void> {
    if (this.cbzService.isAvailable() && window.electronAPI?.selectFiles) {
      const files = await window.electronAPI.selectFiles();
      if (files.length > 0) {
        this.testFilePath = files[0];
      }
    }
  }

  async testFile(): Promise<void> {
    if (!this.testFilePath) return;

    try {
      console.log(`Testing comic file: ${this.testFilePath}`);
      this.testResult = await this.cbzService.testComicFile(this.testFilePath);
      console.log('Test result:', this.testResult);
    } catch (error: any) {
      console.error('Test failed:', error);
      this.testResult = { error: error.message, success: false };
    }
  }

  async loadSupportedFormats(): Promise<void> {
    if (this.cbzService.isAvailable() && window.electronAPI?.getSupportedFormats) {
      try {
        this.supportedFormats = await window.electronAPI.getSupportedFormats();
      } catch (error) {
        console.error('Failed to load formats:', error);
      }
    }
  }

  clearResult(): void {
    this.testResult = null;
  }
}
