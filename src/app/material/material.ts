import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { MaterialService } from '../services/materialService';
import { CategoryService } from '../services/category.service';
import { SidebarComponent } from '../shared/sidebar/sidebar';

interface Course {
  courseId: number;
  courseTitle: string;
  courseCreator: string;
  thumbnail: string;
  coursePrice: number;
  duration: number;
  durationHourse: number;
  lessonsCount: number;
  category: string;
}

@Component({
  selector: 'app-material',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './material.html',
  styleUrl: './material.css',
})
export class Material implements OnInit {
  isDropdownOpen = false;
  isSidebarOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  searchQuery = '';
  selectedFilter = '';

  // Category-related state
  viewMode: 'categories' | 'courses' = 'categories';
  realCategories: any[] = [];
  selectedCategory: any = null;
  loadingCategories = false;
  loadingCourses = false;

  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  enrolledCourses: number[] = []; // Track enrolled course IDs

  constructor(
    private auth: AuthService,
    private router: Router,
    private materialService: MaterialService,
    private categoryService: CategoryService,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();

    this.loadCategories();

    // Load enrolled courses from localStorage
    const enrolled = localStorage.getItem('enrolledCourses');
    if (enrolled) {
      this.enrolledCourses = JSON.parse(enrolled);
    } else {
      this.materialService.getEnrolledCourses().subscribe({
        next: (response: any) => {
          if (response.status === 200 && response.data) {
            this.enrolledCourses = response.data.purchasedCourses.map((id: number) => id);
            localStorage.setItem('enrolledCourses', JSON.stringify(this.enrolledCourses));
          }
        },
        error: (err) => {
          console.error('Failed to load enrolled courses:', err);
        },
      });
    }
  }

  loadCategories() {
    this.loadingCategories = true;
    this.categoryService.getAllCategories().subscribe({
      next: (res: any) => {
        this.realCategories = res || [];
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.loadingCategories = false;
      },
    });
  }

  selectCategory(category: any) {
    this.selectedCategory = category;
    this.viewMode = 'courses';
    this.loadingCourses = true;
    this.allCourses = [];
    this.filteredCourses = [];

    this.categoryService.getCoursesByCategory(category.id).subscribe({
      next: (res: any[]) => {
        this.allCourses = (res || []).map((s) => ({
          courseId: s.courseId,
          courseTitle: s.courseTitle,
          courseCreator: s.courseCreator,
          thumbnail: s.courseImagePath,
          coursePrice: s.coursePrice,
          duration: Math.round(parseFloat(s.courseDurationInSeconds) / 60.0),
          durationHourse: Math.round(
            Math.round(parseFloat(s.courseDurationInSeconds) / 60.0) / 60.0,
          ),
          lessonsCount: s.lessonsCount,
          category: category.title,
        }));
        this.filteredCourses = [...this.allCourses];
        this.loadingCourses = false;
      },
      error: (err) => {
        console.error('Failed to load courses by category:', err);
        this.loadingCourses = false;
      },
    });
  }

  goBackToCategories() {
    this.viewMode = 'categories';
    this.selectedCategory = null;
    this.allCourses = [];
    this.filteredCourses = [];
    this.searchQuery = '';
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  handleAuth() {
    if (this.isLoggedIn) {
      this.auth.logout();
      this.isLoggedIn = false;
      this.userName = 'Guest';
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/material' } });
    }
    this.isDropdownOpen = false;
  }

  onSearch() {
    this.filterCourses();
  }

  filterCourses() {
    if (this.viewMode === 'categories') {
      // Option: search categories if in category mode?
      // For now, prompt asks for courses under category.
      return;
    }
    this.filteredCourses = this.allCourses.filter((course) => {
      const matchesSearch =
        course.courseTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        course.courseCreator.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesSearch;
    });
  }

  userEnrolled(courseId: number): boolean {
    return this.enrolledCourses.includes(courseId);
  }

  enrollCourse(courseId: number) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/material' } });
      return;
    }
    this.router.navigate(['/course-videos', courseId]);
  }

  continueCourse(courseId: number) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/course-videos', courseId]);
  }

  handleUnauthorizedView(courseId: number) {
    this.router.navigate(['/course-videos', courseId]);
  }

  goBackToHome() {
    this.router.navigate(['/home']);
  }
}
