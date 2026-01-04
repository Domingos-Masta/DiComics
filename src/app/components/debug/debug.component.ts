import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

declare const window: any;

@Component({
  selector: 'app-debug.component',
  imports: [CommonModule],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.scss',
})
export class DebugComponent {
  scanResult: any;

  async testScan() {
    try {
      if (window.electronAPI?.selectDirectory) {
        const dirPath = await window.electronAPI.selectDirectory();
        if (dirPath) {
          const result = await window.electronAPI.scanDirectory(dirPath, {
            scanSubdirectories: true,
            maxDepth: 3,
            extensions: ['.cbz', '.zip'],
            excludePatterns: ['.DS_Store', 'Thumbs.db']
          });
          this.scanResult = result;
        }
      }
    } catch (error: any) {
      console.error('Debug scan failed:', error);
      this.scanResult = { error: error.message };
    }
  }
}
