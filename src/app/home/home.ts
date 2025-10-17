import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { CommonModule } from '@angular/common';
import { Suggestion } from '../services/suggestion';
import { Slider } from '../services/slider';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  isDropdownOpen = false;
  isSidebarOpen = false; // <-- New property for sidebar state
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  userData: any;
  suggestions: any[] = [];
  Sliders: any[] = [];
  currentSlide = 0;
  autoSlideInterval: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private suggestionService: Suggestion,
    private sliderService: Slider
  ) {}

  ngOnInit() {
    // ✅ User
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userData = this.auth.getUserData();
    this.userName = this.userData
      ? `${this.userData.firstName} ${this.userData.lastName}`
      : 'Guest';
    this.isAdmin = this.auth.isAdmin();

    // ✅ Suggestions
    this.suggestionService.getAllSuggestions().subscribe({
      next: (res: any[]) => {
        this.suggestions = res.map((s) => ({
          ...s,
          videoUrl: this.suggestionService.getSuggestionFileUrl(s.id),
          duration: null,
        }));
        this.suggestions.forEach((s) => this.loadVideoDuration(s));
      },
      error: (err) => console.error('❌ Error fetching suggestions:', err),
    });

    // ✅ Sliders
    this.sliderService.getAllSliders().subscribe({
      next: (res: any[]) => {
        this.Sliders = res.map((s) => ({
          ...s,
          imageUrl: this.sliderService.getSliderFileUrl(s.id),
        }));
      },
      error: (err) => console.error('❌ Error fetching sliders:', err),
    });

    this.startAutoSlide();
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => this.nextSlide(), 4000);
  }

  stopAutoSlide() {
    clearInterval(this.autoSlideInterval);
  }

  nextSlide() {
    this.stopAutoSlide();
    this.currentSlide = this.currentSlide === this.Sliders.length - 1 ? 0 : this.currentSlide + 1;
    this.startAutoSlide();
  }

  prevSlide() {
    this.stopAutoSlide();
    this.currentSlide = this.currentSlide === 0 ? this.Sliders.length - 1 : this.currentSlide - 1;
    this.startAutoSlide();
  }

  goToSlide(index: number) {
    this.stopAutoSlide();
    this.currentSlide = index;
    this.startAutoSlide();
  }

  loadVideoDuration(suggestion: any) {
    const video = document.createElement('video');
    video.src = suggestion.videoUrl;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const totalSeconds = Math.floor(video.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      suggestion.duration = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    };
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // <-- New method to toggle sidebar -->
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  playVideo(suggestion: any) {
    // Optional: Stop any currently playing video
    this.suggestions.forEach((s) => {
      if (s !== suggestion && s.isPlaying) {
        s.isPlaying = false;
      }
    });

    // Start the clicked video
    suggestion.isPlaying = true;
  }

  handleAuth() {
    if (this.isLoggedIn) {
      this.auth.logout();
      this.isLoggedIn = false;
      this.router.navigate(['/home']).then(() => window.location.reload());
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/home' } });
    }
    this.isDropdownOpen = false;
  }

  leftMenuClick(field: string) {
    let nav = '';
    switch (field) {
      case 'Material':
        nav = '/material';
        break;
      case 'Books':
        nav = '/books';
        break;
    }

    // if (!this.auth.isLoggedIn()) {
    //   this.router.navigate(['/login'], { queryParams: { returnUrl: nav } });
    //   return;
    // }

    this.router.navigate([nav]);
  }

  onBannerClick(id: number) {
    const banner = this.Sliders.find((s) => s.id === id);
    if (banner && banner.link) {
      window.open(banner.link, '_blank');
    }
  }
}
