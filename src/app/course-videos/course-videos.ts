import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth';
import { MaterialService } from '../services/materialService';

interface Course {
  courseId: number;
  courseTitle: string;
  courseCreator: string;
  coursePrice: number;
}

interface Lesson {
  id: number;
  title: string;
  subtitle?: string;
  isFree: boolean;
  videoUrl: string;
  duration?: number;
}

@Component({
  selector: 'app-course-videos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-videos.html',
  styleUrl: './course-videos.css',
})
export class CourseVideos implements OnInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  loading = true;
  errorMessage = '';
  isLoggedIn = false;
  isEnrolled = false;
  loadingEnroll = false;
  showLockedModal = false;

  courseId: number = 0;
  course: Course | null = null;
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  currentVideoUrl: string = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private materialService: MaterialService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    // Get course ID from route
    this.route.params.subscribe((params) => {
      this.courseId = +params['id'];
      if (this.courseId) {
        this.checkEnrollmentStatus();
        this.loadCourseData();
      } else {
        this.errorMessage = 'Invalid course ID';
        this.loading = false;
      }
    });
  }

  checkEnrollmentStatus() {
    const enrolled = localStorage.getItem('enrolledCourses');
    if (enrolled) {
      const enrolledCourses: number[] = JSON.parse(enrolled);
      this.isEnrolled = enrolledCourses.includes(this.courseId);
    }
  }

  loadCourseData() {
    this.loading = true;
    this.errorMessage = '';

    // Load course details
    this.materialService.getCourseById(this.courseId).subscribe({
      next: (res: any) => {
        this.course = {
          courseId: res.courseId,
          courseTitle: res.courseTitle,
          courseCreator: res.courseCreator,
          coursePrice: res.coursePrice,
        };

        // Load lessons
        this.loadLessons();
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.errorMessage = 'Failed to load course. Please try again.';
        this.loading = false;
      },
    });
  }

  loadLessons() {
    this.materialService.getCourseLessons(this.courseId).subscribe({
      next: (res: any[]) => {
        this.lessons = res.map((lesson, index) => ({
          id: lesson.id,
          title: lesson.title,
          subtitle: lesson.subtitle || `Lesson -${index + 1}`,
          isFree: lesson.isFree || false,
          videoUrl: this.materialService.getLessonVideoFile(lesson.id),
          duration: lesson.duration,
        }));

        // Auto-play first accessible lesson
        const firstAccessible = this.lessons.find((l) => this.canAccessLesson(l));

        if (firstAccessible) {
          this.selectLesson(firstAccessible);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading lessons:', err);
        this.errorMessage = 'Failed to load lessons. Please try again.';
        this.loading = false;
      },
    });
  }

  canAccessLesson(lesson: Lesson): boolean {
    // Free lessons are accessible to everyone
    if (lesson.isFree) {
      return true;
    }
    // Paid lessons only for enrolled users
    return this.isEnrolled;
  }

  selectLesson(lesson: Lesson) {
    if (!this.canAccessLesson(lesson)) {
      // Show professional modal
      this.showLockedModal = true;
      return;
    }

    this.currentLesson = lesson;
    this.currentVideoUrl = lesson.videoUrl;

    // Wait for video element to be ready
    setTimeout(() => {
      if (this.videoPlayer) {
        this.videoPlayer.nativeElement.load();
        // this.videoPlayer.nativeElement.play().catch((err) => {
        //   console.error('Error playing video:', err);
        // });
      }
    }, 100);
  }

  enrollInCourse() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/material` },
      });
      return;
    }

    this.loadingEnroll = true; // ⏳ Start loader

    if (this.course && this.course.coursePrice > 0) {
      this.materialService.goToPayment(this.courseId).subscribe({
        next: (response: any) => {
          this.loadingEnroll = false; // ✅ Stop loader
          if (response.status === 200 && response.message) {
            localStorage.removeItem('enrolledCourses');
            window.location.href = response.message;
          } else {
            alert('Failed to initiate payment. Please try again.');
          }
        },
        error: (err) => {
          console.error('Payment error:', err);
          alert('Payment error occurred.');
          this.loadingEnroll = false; // ❌ Stop loader even on error
        },
      });
    } else {
      // ✅ Free course — enroll immediately
      const enrolled = localStorage.getItem('enrolledCourses');
      let enrolledCourses: number[] = enrolled ? JSON.parse(enrolled) : [];

      if (!enrolledCourses.includes(this.courseId)) {
        enrolledCourses.push(this.courseId);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
        this.isEnrolled = true;
        this.showSuccessToast();
        console.log('Enrolled in free course:', this.courseId);
      }

      this.loadingEnroll = false; // ✅ Stop loader
    }
  }

  showSuccessToast() {
    const existingToast = document.querySelector('.success-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
      <i class="bi bi-check-circle-fill"></i>
      <span>Successfully enrolled! All lessons are now unlocked.</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  onTimeUpdate(event: Event) {
    // Track video progress
    const video = event.target as HTMLVideoElement;
    const progress = (video.currentTime / video.duration) * 100;

    // TODO: Save progress to backend
    // console.log('Progress:', progress);
  }

  onVideoEnded() {
    // Auto-play next lesson if available
    if (this.currentLesson) {
      const currentIndex = this.lessons.findIndex((l) => l.id === this.currentLesson!.id);
      const nextLesson = this.lessons[currentIndex + 1];

      if (nextLesson && this.canAccessLesson(nextLesson)) {
        this.selectLesson(nextLesson);
      }
    }
  }

  goBackToCourses() {
    this.router.navigate(['/material']);
  }

  closeLockedModal() {
    this.showLockedModal = false;
  }

  enrollFromModal() {
    this.closeLockedModal();
    this.enrollInCourse();
  }
}
