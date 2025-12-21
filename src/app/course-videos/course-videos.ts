import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth';
import { MaterialService } from '../services/materialService';
import { HttpClient } from '@angular/common/http';
import { environment } from '../services/enviroment';

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
  durationInMinutes?: number;
  arrange?: number;
  mcq?: LessonExercise[];
  exercises?: LessonExercise[];
}

interface LessonExercise {
  id?: number;
  questionText: string;
  explanation?: string;
  imageLink?: string;
  imageUrl?: string;
  answers: ExerciseAnswer[];
}

interface ExerciseAnswer {
  id?: number;
  answerText: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-course-videos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-videos.html',
  styleUrl: './course-videos.css',
})
export class CourseVideos implements OnInit {
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
  videoKey: number = 0;

  showMCQQuiz = false;
  currentExercises: LessonExercise[] = [];
  currentQuestionIndex = 0;
  selectedAnswers: { [questionIndex: number]: number } = {};
  quizSubmitted = false;
  quizScore = { correct: 0, total: 0 };

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private materialService: MaterialService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
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
        this.lessons = res.map((lesson, index) => {
          // Map MCQs from the lesson object
          const mcqs: LessonExercise[] = (lesson.mcq || []).map((mcq: any) => ({
            id: mcq.id,
            questionText: mcq.questionText,
            explanation: mcq.explanation,
            imageLink: mcq.imageLink,
            imageUrl: mcq.imageLink, // Use imageLink as imageUrl
            answers: (mcq.answers || []).map((ans: any) => ({
              id: ans.id,
              answerText: ans.answerText,
              isCorrect: ans.isCorrect,
            })),
          }));

          return {
            id: lesson.id,
            title: lesson.title,
            subtitle:
              lesson.subtitle ||
              `Lesson ${index + 1} · ${
                lesson.durationInMinutes || Math.floor((lesson.duration || 0) / 60)
              } min`,
            isFree: lesson.isFree || false,
            videoUrl: lesson.path || lesson.videoUrl,
            duration: lesson.duration,
            durationInMinutes: lesson.durationInMinutes,
            arrange: lesson.arrange,
            mcq: mcqs,
            exercises: mcqs, // Also set exercises for backward compatibility
          };
        });

        // Auto-play first accessible lesson (first lesson by default)
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

    // Don't reload if it's the same lesson
    if (this.currentLesson?.id === lesson.id) {
      return;
    }

    this.currentLesson = lesson;

    // Reset quiz state first
    this.showMCQQuiz = false;
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizSubmitted = false;

    // Load MCQs directly from lesson object
    this.currentExercises = lesson.mcq || lesson.exercises || [];

    // Update video URL
    this.currentVideoUrl = lesson.videoUrl;
    this.videoKey = Date.now();

    // Trigger change detection
    this.cdr.detectChanges();
  }

  startMCQQuiz() {
    if (this.currentExercises.length === 0) {
      alert('No questions available for this lesson.');
      return;
    }
    this.showMCQQuiz = true;
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizSubmitted = false;
    // Scroll to quiz section
    setTimeout(() => {
      const quizElement = document.getElementById('mcq-quiz-section');
      if (quizElement) {
        quizElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }

  selectAnswer(questionIndex: number, answerIndex: number) {
    if (this.quizSubmitted) return;
    this.selectedAnswers[questionIndex] = answerIndex;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.currentExercises.length - 1) {
      this.currentQuestionIndex++;
      const questionElement = document.getElementById(`question-${this.currentQuestionIndex}`);
      if (questionElement) {
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      const questionElement = document.getElementById(`question-${this.currentQuestionIndex}`);
      if (questionElement) {
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  submitQuiz() {
    if (this.quizSubmitted) return;

    let correct = 0;
    this.currentExercises.forEach((exercise, questionIndex) => {
      const selectedAnswerIndex = this.selectedAnswers[questionIndex];
      if (selectedAnswerIndex !== undefined) {
        const selectedAnswer = exercise.answers[selectedAnswerIndex];
        if (selectedAnswer && selectedAnswer.isCorrect) {
          correct++;
        }
      }
    });

    this.quizScore = {
      correct: correct,
      total: this.currentExercises.length,
    };
    this.quizSubmitted = true;
  }

  closeQuiz() {
    this.showMCQQuiz = false;
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizSubmitted = false;
  }

  // Helper methods for template
  getCharCode(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  floor(value: number): number {
    return Math.floor(value);
  }

  getLessonSubtitle(lesson: Lesson, index: number): string {
    if (lesson.subtitle) {
      return lesson.subtitle;
    }
    const duration = lesson.durationInMinutes || this.floor((lesson.duration || 0) / 60);
    return `Lesson ${index + 1} · ${duration} min`;
  }

  enrollInCourse() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/material` },
      });
      return;
    }

    this.loadingEnroll = true;

    if (this.course && this.course.coursePrice > 0) {
      this.materialService.goToPayment(this.courseId).subscribe({
        next: (response: any) => {
          this.loadingEnroll = false;
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
          this.loadingEnroll = false;
        },
      });
    } else {
      // Free course – enroll immediately
      const enrolled = localStorage.getItem('enrolledCourses');
      let enrolledCourses: number[] = enrolled ? JSON.parse(enrolled) : [];

      if (!enrolledCourses.includes(this.courseId)) {
        enrolledCourses.push(this.courseId);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
        this.isEnrolled = true;
        this.showSuccessToast();
        console.log('Enrolled in free course:', this.courseId);
      }

      this.loadingEnroll = false;
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
