import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ReaderComponent } from './components/reader-component/reader.component';
import { SettingsComponent } from './components/settings.component/settings.component';
import { ComicDetailsComponent } from './components/comic-details/comic-details.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home' },
  { path: 'comic/:id', component: ComicDetailsComponent, title: 'Comic Details' },
  { path: 'reader/:id', component: ReaderComponent, title: 'Reade' },
  { path: 'settings', component: SettingsComponent, title: 'Settings' },
  { path: '**', redirectTo: '' }
];
