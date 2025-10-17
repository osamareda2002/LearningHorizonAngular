import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WatermarkService {
  private canvas: HTMLCanvasElement | null = null;
  private fullscreenCanvas: HTMLCanvasElement | null = null;
  private animationFrameId: number | null = null;
  private watermarkText: string = '';
  private containerElement: HTMLElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isFullscreen = false;

  initializeWatermark(
    videoElement: HTMLVideoElement,
    userEmail: string,
    containerElement: HTMLElement,
    isPaidCourse: boolean,
    isLockedLesson: boolean
  ) {
    // Only show watermark for paid courses or locked lessons
    if (!isPaidCourse && !isLockedLesson) {
      console.log('Watermark not shown - Free course with free lesson');
      return;
    }

    this.watermarkText = `${userEmail} - Licensed Copy`;
    this.containerElement = containerElement;
    this.videoElement = videoElement;

    // Create main overlay canvas
    this.createMainCanvas();

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

    // Start animation loop
    this.startWatermarkAnimation();
  }

  private createMainCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9998';
    this.canvas.style.mixBlendMode = 'multiply';
    this.canvas.style.opacity = '0.3';

    document.body.appendChild(this.canvas);

    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  private handleFullscreenChange() {
    this.isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (this.isFullscreen) {
      this.createFullscreenOverlay();
    } else {
      this.removeFullscreenOverlay();
    }
  }

  private createFullscreenOverlay() {
    // Create fullscreen canvas overlay
    this.fullscreenCanvas = document.createElement('canvas');
    this.fullscreenCanvas.style.position = 'fixed';
    this.fullscreenCanvas.style.top = '0';
    this.fullscreenCanvas.style.left = '0';
    this.fullscreenCanvas.style.width = '100%';
    this.fullscreenCanvas.style.height = '100%';
    this.fullscreenCanvas.style.pointerEvents = 'none';
    this.fullscreenCanvas.style.zIndex = '999999';
    this.fullscreenCanvas.style.mixBlendMode = 'multiply';
    this.fullscreenCanvas.style.opacity = '0.3';

    document.body.appendChild(this.fullscreenCanvas);
    this.updateFullscreenCanvasSize();
  }

  private removeFullscreenOverlay() {
    if (this.fullscreenCanvas && this.fullscreenCanvas.parentNode) {
      this.fullscreenCanvas.parentNode.removeChild(this.fullscreenCanvas);
      this.fullscreenCanvas = null;
    }
  }

  private updateCanvasSize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  private updateFullscreenCanvasSize() {
    if (this.fullscreenCanvas) {
      this.fullscreenCanvas.width = window.innerWidth;
      this.fullscreenCanvas.height = window.innerHeight;
    }
  }

  private startWatermarkAnimation() {
    const animate = () => {
      this.drawWatermark();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private drawWatermark() {
    // Draw on main canvas if not in fullscreen
    if (!this.isFullscreen && this.canvas) {
      this.drawOnCanvas(this.canvas);
    }

    // Draw on fullscreen canvas if in fullscreen
    if (this.isFullscreen && this.fullscreenCanvas) {
      this.drawOnCanvas(this.fullscreenCanvas);
    }
  }

  private drawOnCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.textAlign = 'center';

    // Get current time for animation
    const time = Date.now() / 1000;
    const positions = [
      { x: canvas.width * 0.25, y: canvas.height * 0.2 },
      { x: canvas.width * 0.75, y: canvas.height * 0.35 },
      { x: canvas.width * 0.5, y: canvas.height * 0.65 },
      { x: canvas.width * 0.25, y: canvas.height * 0.8 },
      { x: canvas.width * 0.75, y: canvas.height * 0.85 },
    ];

    // Draw watermark text at multiple positions with dynamic rotation
    positions.forEach((pos, index) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);

      const rotation = (time + index * 0.5) * 0.1;
      ctx.rotate(rotation);

      ctx.fillText(this.watermarkText, 0, 0);

      ctx.restore();
    });

    // Draw diagonal watermarks across the screen
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.textAlign = 'center';

    for (let i = -2; i < 3; i++) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);

      ctx.fillText(this.watermarkText, i * (canvas.width / 2), 0);

      ctx.restore();
    }
  }

  destroyWatermark() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    if (this.fullscreenCanvas && this.fullscreenCanvas.parentNode) {
      this.fullscreenCanvas.parentNode.removeChild(this.fullscreenCanvas);
    }

    document.removeEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.removeEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.removeEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.removeEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

    this.canvas = null;
    this.fullscreenCanvas = null;
    this.watermarkText = '';
  }

  // Detect if user is taking screenshot or recording
  detectScreenCapture() {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.warn('Screen capture or tab switch detected');
        this.logActivity('Screen capture or tab switch detected');
      }
    });

    // Detect right-click (context menu)
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      console.warn('Right-click attempt detected');
      this.logActivity('Right-click attempt detected');
      alert('Screen capture and downloads are disabled for protected content.');
      return false;
    });

    // Disable keyboard shortcuts for screenshots
    document.addEventListener('keydown', (e) => {
      // Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        console.warn('Print Screen detected');
        this.logActivity('Print Screen key pressed');
        alert('Screenshots are disabled for this video.');
      }

      // Windows Snip Tool (Win + Shift + S)
      if (e.key === 's' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.logActivity('Snip tool shortcut detected');
      }

      // Mac Screenshot (Cmd + Shift + 3, 4)
      if (e.key === '3' && e.metaKey && e.shiftKey) {
        e.preventDefault();
        this.logActivity('Mac screenshot shortcut detected');
      }
      if (e.key === '4' && e.metaKey && e.shiftKey) {
        e.preventDefault();
      }
    });
  }

  // Log suspicious activity
  logActivity(activity: string) {
    const timestamp = new Date().toISOString();
    console.log(`[SECURITY] ${activity} - Time: ${timestamp}`);

    // TODO: Send to backend for logging
    // this.http.post('/api/security-logs', { activity, timestamp })
  }
}
