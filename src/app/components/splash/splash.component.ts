import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit, AfterViewInit {
  loading = true;
  progress = 0;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.simulateLoading();
  }

  ngAfterViewInit(): void {
    // Auto-navigate after 5 seconds
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 5000);
  }

  simulateLoading(): void {
    const interval = setInterval(() => {
      this.progress += 10;
      if (this.progress >= 100) {
        clearInterval(interval);
        this.loading = false;
      }
    }, 500);
  }
}