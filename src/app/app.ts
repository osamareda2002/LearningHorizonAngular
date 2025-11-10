import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = 'learning-horizon';
  private routerSubscription?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    // Listen to route changes and hide Zoom container when not on zoom-meeting route
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        if (!url.includes('/zoom-meeting')) {
          this.hideZoomContainer();
        }
      });

    // Initial check to hide container if not on zoom-meeting route
    if (!this.router.url.includes('/zoom-meeting')) {
      this.hideZoomContainer();
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private hideZoomContainer() {
    try {
      const zoomRoot = document.getElementById('zmmtg-root');
      if (zoomRoot) {
        // Remove the active attribute to trigger CSS hiding
        zoomRoot.removeAttribute('data-meeting-active');
        zoomRoot.style.display = 'none';
        zoomRoot.style.visibility = 'hidden';
        zoomRoot.style.opacity = '0';
        zoomRoot.style.position = 'fixed';
        zoomRoot.style.top = '-9999px';
        zoomRoot.style.left = '-9999px';
        zoomRoot.style.zIndex = '-1';
        zoomRoot.setAttribute('aria-hidden', 'true');
      }
    } catch (error) {
      console.warn('Error hiding Zoom container in app component:', error);
    }
  }
}
