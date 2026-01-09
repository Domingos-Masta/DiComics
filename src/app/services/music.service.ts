// music.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  genre: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  private audio: HTMLAudioElement;
  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private currentTrackSubject = new BehaviorSubject<MusicTrack | null>(null);
  private volumeSubject = new BehaviorSubject<number>(50);
  
  isPlaying$ = this.isPlayingSubject.asObservable();
  currentTrack$ = this.currentTrackSubject.asObservable();
  volume$ = this.volumeSubject.asObservable();
  
  // Mock playlists
  private playlists = {
    ambient: [
      {
        id: '1',
        title: 'Cosmic Ambience',
        artist: 'Space Sounds',
        url: 'assets/music/ambient1.mp3',
        genre: 'ambient',
        duration: 180
      }
    ],
    epic: [
      {
        id: '2',
        title: 'Heroic Journey',
        artist: 'Epic Orchestra',
        url: 'assets/music/epic1.mp3',
        genre: 'epic',
        duration: 240
      }
    ],
    chill: [
      {
        id: '3',
        title: 'Relaxing Vibes',
        artist: 'Chill Beats',
        url: 'assets/music/chill1.mp3',
        genre: 'chill',
        duration: 210
      }
    ]
  };
  
  constructor() {
    this.audio = new Audio();
    this.audio.volume = this.volumeSubject.value / 100;
    
    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });
  }
  
  playGenre(genre: string) {
    const playlist = this.playlists[genre as keyof typeof this.playlists];
    if (playlist && playlist.length > 0) {
      const track = playlist[0];
      this.playTrack(track);
    }
  }
  
  playTrack(track: MusicTrack) {
    this.audio.src = track.url;
    this.audio.load();
    this.audio.play();
    this.currentTrackSubject.next(track);
    this.isPlayingSubject.next(true);
  }
  
  togglePlayback() {
    if (this.audio.paused) {
      this.audio.play();
      this.isPlayingSubject.next(true);
    } else {
      this.audio.pause();
      this.isPlayingSubject.next(false);
    }
  }
  
  nextTrack() {
    // Implement playlist logic
  }
  
  previousTrack() {
    // Implement playlist logic
  }
  
  setVolume(volume: number) {
    this.volumeSubject.next(volume);
    this.audio.volume = volume / 100;
  }
  
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlayingSubject.next(false);
  }
}