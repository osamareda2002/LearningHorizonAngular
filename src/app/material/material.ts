import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { MaterialService } from '../services/materialService';
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
  categories: string[] = [];

  allCourses: Course[] = [];

  filteredCourses: Course[] = [];
  enrolledCourses: number[] = []; // Track enrolled course IDs

  constructor(
    private auth: AuthService,
    private router: Router,
    private materialService: MaterialService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();

    this.materialService.getAllMaterials().subscribe({
      next: (res: any[]) => {
        res.map((s) => {
          let obj = {
            courseId: s.courseId,
            courseTitle: s.courseTitle,
            courseCreator: s.courseCreator,
            thumbnail: s.courseImagePath,
            coursePrice: s.coursePrice,
            duration: Math.round(parseFloat(s.courseDurationInSeconds) / 60.0),
            durationHourse: Math.round(
              Math.round(parseFloat(s.courseDurationInSeconds) / 60.0) / 60.0
            ),
            lessonsCount: s.lessonsCount,
            category: '',
          };
          this.allCourses.push(obj);
          this.categories.push(obj.courseTitle);
        });
      },
    });

    this.filteredCourses = this.allCourses;
    this.filteredCourses.map((fc) => {
      console.log('fc', fc.thumbnail);
    });
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
          console.log(err);
        },
      });
    }
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
    this.filteredCourses = this.allCourses.filter((course) => {
      const matchesSearch =
        course.courseTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        course.courseCreator.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory =
        this.selectedFilter === '' || course.courseTitle === this.selectedFilter;
      return matchesSearch && matchesCategory;
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

    // Navigate to course videos page
    this.router.navigate(['/course-videos', courseId]);
  }

  continueCourse(courseId: number) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    // Navigate to course videos page
    this.router.navigate(['/course-videos', courseId]);
  }

  handleUnauthorizedView(courseId: number) {
    // Allow viewing course page even without login (free lessons available)
    this.router.navigate(['/course-videos', courseId]);
  }

  goBackToHome() {
    this.router.navigate(['/home']);
  }
}
