import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// Plyr has no Angular typings bundled; use require at runtime
declare const Plyr: any;

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="player-wrapper">
      <video #videoRef class="plyr__video-embed" playsinline></video>
    </div>
  `,
  styles: [
    `
    .player-wrapper { width: 100%; border-radius: 12px; overflow: hidden; background: #000; }
    video { width: 100%; height: auto; display: block; }
    `,
  ],
})
export class VideoPlayerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() src: string = '';
  @Input() poster: string | null = null;
  @Input() autoplay: boolean = false;
  @Input() muted: boolean = false;
  @Input() controls: boolean = true;

  @ViewChild('videoRef', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private player: any | null = null;
  private hls: any | null = null;
  private isInitialized = false;
  private Hls: any = null;
  private PlyrCtor: any = null;

  async ngAfterViewInit() {
    await this.initializeLibraries();
    if (this.src) {
      this.loadVideo();
    }
    this.isInitialized = true;
  }

  async initializeLibraries() {
    if (!this.Hls || !this.PlyrCtor) {
      const [{ default: Hls }, plyrModule] = await Promise.all([
        import('hls.js'),
        import('plyr'),
      ]);
      this.Hls = Hls;
      this.PlyrCtor = (plyrModule as any).default || (window as any).Plyr || Plyr;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] && !changes['src'].firstChange && this.isInitialized && this.src) {
      this.loadVideo();
    }
  }

  async loadVideo() {
    const videoEl = this.videoRef.nativeElement;
    if (!videoEl) return;

    // Clean up existing HLS instance
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }

    // Clean up existing player
    if (this.player) {
      try {
        this.player.destroy();
      } catch {}
      this.player = null;
    }

    // Wait for libraries if not loaded
    if (!this.Hls || !this.PlyrCtor) {
      await this.initializeLibraries();
    }

    // Set basic attributes
    if (this.poster) {
      videoEl.setAttribute('poster', this.poster);
    } else {
      videoEl.removeAttribute('poster');
    }
    
    if (this.autoplay) {
      videoEl.setAttribute('autoplay', '');
    } else {
      videoEl.removeAttribute('autoplay');
    }
    
    videoEl.muted = this.muted;
    
    if (this.controls) {
      videoEl.setAttribute('controls', '');
    } else {
      videoEl.removeAttribute('controls');
    }

    // HLS support
    const isHls = this.src?.toLowerCase().endsWith('.m3u8');
    if (isHls && this.Hls.isSupported()) {
      this.hls = new this.Hls();
      this.hls.loadSource(this.src);
      this.hls.attachMedia(videoEl);
    } else {
      videoEl.src = this.src;
    }

    // Init Plyr
    this.player = new this.PlyrCtor(videoEl, {
      autoplay: this.autoplay,
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'pip',
        'airplay', 'fullscreen',
      ],
      settings: ['captions', 'quality', 'speed'],
      ratio: '16:9',
    });

    // Handle autoplay
    if (this.autoplay) {
      videoEl.addEventListener('loadedmetadata', () => {
        videoEl.play().catch(() => {
          // Autoplay failed, user interaction required
        });
      }, { once: true });
    }
  }

  ngOnDestroy() {
    try {
      if (this.player && typeof this.player.destroy === 'function') this.player.destroy();
    } catch {}
    try {
      if (this.hls) this.hls.destroy();
    } catch {}
    this.player = null;
    this.hls = null;
  }
}


