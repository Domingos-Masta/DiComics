import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnInit {

  appVersion = '1.0.0'; // You can set this dynamically if needed
  @Output() aboutDialogOpenChange = new EventEmitter<boolean>();

  closeAboutDialog(): void {
    this.aboutDialogOpenChange.emit(false);
  }

  ngOnInit(): void {
    this.fetchAppVersion();

  }

  async fetchAppVersion() {
    this.appVersion = await (window as any).electronAPI.getAppVersion();
    console.log('App Version:', this.appVersion);
  }
}