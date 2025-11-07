import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
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
export class VideoPlayerComponent implements AfterViewInit, OnDestroy {
  @Input() src: string = '';
  @Input() poster: string | null = null;
  @Input() autoplay: boolean = false;
  @Input() muted: boolean = false;
  @Input() controls: boolean = true;

  @ViewChild('videoRef', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private player: any | null = null;
  private hls: any | null = null;

  async ngAfterViewInit() {
    const videoEl = this.videoRef.nativeElement;

    // Set basic attributes
    if (this.poster) videoEl.setAttribute('poster', this.poster);
    if (this.autoplay) videoEl.setAttribute('autoplay', '');
    if (this.muted) videoEl.muted = true;
    if (this.controls) videoEl.setAttribute('controls', '');

    // Lazy-load libraries
    const [{ default: Hls }, plyrModule] = await Promise.all([
      import('hls.js'),
      import('plyr'),
    ]);

    // HLS support
    const isHls = this.src?.toLowerCase().endsWith('.m3u8');
    if (isHls && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.loadSource(this.src);
      this.hls.attachMedia(videoEl);
    } else {
      videoEl.src = this.src;
    }

    // Init Plyr
    const PlyrCtor: any = (plyrModule as any).default || (window as any).Plyr || Plyr;
    this.player = new PlyrCtor(videoEl, {
      autoplay: this.autoplay,
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'pip',
        'airplay', 'fullscreen',
      ],
      settings: ['captions', 'quality', 'speed'],
      ratio: '16:9',
    });
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


