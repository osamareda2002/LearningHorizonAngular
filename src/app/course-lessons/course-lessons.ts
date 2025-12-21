import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { MaterialService } from '../services/materialService';
import { SidebarComponent } from '../shared/sidebar/sidebar';

interface Course {
  courseId: number;
  courseTitle: string;
  courseCreator: string;
  coursePrice: number;
  coursePath: string;
  courseImagePath: string;
  courseDurationInSeconds: number;
}

interface Lesson {
  id: number;
  title: string;
  path: string;
  isFree: boolean;
  courseId: number;
  duration: number;
  durationInMinutes: number;
  arrange: number;
  mcq: MCQQuestion[];
  isCompleted?: boolean;
}

interface MCQQuestion {
  id: number;
  questionText: string;
  explanation: string;
  imageLink: string;
  answers: MCQAnswer[];
}

interface MCQAnswer {
  id: number;
  answerText: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-course-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, RouterLink],
  templateUrl: './course-lessons.html',
  styleUrl: './course-lessons.css',
})
export class CourseLessonsComponent implements OnInit {
  @ViewChild('videoPlayer', { static: false }) videoPlayerRef!: ElementRef<HTMLVideoElement>;

  isSidebarOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';

  courseId: number = 0;
  course: Course | null = null;
  courseTitle: string = '';
  currentVideoUrl: string = '';
  currentLessonId: number = 0;

  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;

  // Quiz state
  showQuiz = false;
  currentQuestionIndex = 0;
  selectedAnswer: number | null = null;
  quizResults: boolean[] = [];
  quizCompleted = false;
  score = 0;

  // Loading states
  isLoadingCourse = true;
  isLoadingLessons = true;
  loadError: string = '';

  videoKey: number = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private materialService: MaterialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();

    // Get course ID from route params
    this.route.params.subscribe((params) => {
      this.courseId = +params['id'];
      if (this.courseId) {
        this.loadCourseData();
        this.loadLessons();
      } else {
        this.loadError = 'Invalid course ID';
        this.router.navigate(['/material']);
      }
    });
  }

  loadCourseData() {
    this.isLoadingCourse = true;
    this.materialService.getCourseById(this.courseId).subscribe({
      next: (response: any) => {
        if (response) {
          this.course = response;
          this.courseTitle = response.courseTitle || 'Course';
        }
        this.isLoadingCourse = false;
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.loadError = 'Failed to load course details';
        this.isLoadingCourse = false;
      },
    });
  }

  loadLessons() {
    this.isLoadingLessons = true;
    this.materialService.getCourseLessons(this.courseId).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response)) {
          this.lessons = response.map((lesson: any) => ({
            ...lesson,
            isCompleted: this.isLessonCompleted(lesson.id),
          }));

          // Load first available lesson
          if (this.lessons.length > 0) {
            const firstLesson = this.lessons[0];
            this.playLesson(firstLesson);
          }
        }
        this.isLoadingLessons = false;
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.loadError = 'Failed to load lessons';
        this.isLoadingLessons = false;
      },
    });
  }

  isLessonCompleted(lessonId: number): boolean {
    // Check from localStorage or your completion tracking system
    const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '[]');
    return completedLessons.includes(lessonId);
  }

  markLessonAsCompleted(lessonId: number) {
    const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '[]');
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
      localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
    }

    // Update the lesson in the list
    const lesson = this.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      lesson.isCompleted = true;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  playLesson(lesson: Lesson) {
    // Check if lesson is locked
    if (!lesson.isFree && !this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/course-lessons/${this.courseId}` },
      });
      return;
    }

    // Don't reload if it's the same lesson
    if (this.currentLessonId === lesson.id && this.currentVideoUrl === lesson.path) {
      return;
    }

    // Update current lesson info
    this.currentLessonId = lesson.id;
    this.currentLesson = lesson;

    // Reset quiz state when switching lessons
    this.resetQuiz();

    // Force video URL change by clearing first
    this.currentVideoUrl = '';
    this.videoKey = Date.now();

    // Use ChangeDetectorRef to force update
    this.cdr.detectChanges();

    // Set new video URL after a short delay
    setTimeout(() => {
      this.currentVideoUrl = lesson.path;
      this.videoKey = Date.now() + 1;
      this.cdr.detectChanges();

      // Force video element to reload
      setTimeout(() => {
        if (this.videoPlayerRef && this.videoPlayerRef.nativeElement) {
          const videoElement = this.videoPlayerRef.nativeElement;
          videoElement.load();
        }
      }, 100);
    }, 100);
  }

  getLessonIcon(lessonIndex: number): string {
    const icons = [
      'bi-toggle-on',
      'bi-grid-3x3',
      'bi-list',
      'bi-pencil',
      'bi-save',
      'bi-play-circle',
      'bi-book',
      'bi-code-square',
      'bi-lightbulb',
      'bi-gear',
    ];
    return icons[lessonIndex % icons.length];
  }

  startQuiz() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/course-lessons/${this.courseId}` },
      });
      return;
    }

    if (!this.currentLesson || !this.currentLesson.mcq || this.currentLesson.mcq.length === 0) {
      alert('No quiz available for this lesson');
      return;
    }

    this.showQuiz = true;
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
    this.quizResults = [];
    this.quizCompleted = false;
    this.score = 0;
  }

  selectAnswer(answerId: number) {
    this.selectedAnswer = answerId;
  }

  submitAnswer() {
    if (this.selectedAnswer === null || !this.currentQuestion) return;

    // Find the correct answer
    const correctAnswer = this.currentQuestion.answers.find((a) => a.isCorrect);
    const isCorrect = this.selectedAnswer === correctAnswer?.id;

    this.quizResults.push(isCorrect);

    if (isCorrect) {
      this.score++;
    }

    // Move to next question or finish
    if (this.currentQuestionIndex < this.getMcqQuestions().length - 1) {
      this.nextQuestion();
    } else {
      this.finishQuiz();
    }
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.selectedAnswer = null;
  }

  finishQuiz() {
    this.quizCompleted = true;

    // Mark lesson as completed if quiz passed (you can adjust the passing criteria)
    if (this.currentLesson && this.score >= this.getMcqQuestions().length * 0.7) {
      this.markLessonAsCompleted(this.currentLesson.id);
    }
  }

  resetQuiz() {
    this.showQuiz = false;
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
    this.quizResults = [];
    this.quizCompleted = false;
    this.score = 0;
  }

  retakeQuiz() {
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
    this.quizResults = [];
    this.quizCompleted = false;
    this.score = 0;
  }

  backToCourses() {
    this.router.navigate(['/material']);
  }

  getMcqQuestions(): MCQQuestion[] {
    return this.currentLesson?.mcq || [];
  }

  get currentQuestion(): MCQQuestion | null {
    const questions = this.getMcqQuestions();
    return questions[this.currentQuestionIndex] || null;
  }

  get progressPercentage(): number {
    const questions = this.getMcqQuestions();
    if (questions.length === 0) return 0;
    return ((this.currentQuestionIndex + 1) / questions.length) * 100;
  }

  get isLoading(): boolean {
    return this.isLoadingCourse || this.isLoadingLessons;
  }

  hasQuizImage(question: MCQQuestion): boolean {
    return (
      !!question.imageLink &&
      question.imageLink.trim() !== '' &&
      !question.imageLink.includes('null') &&
      !question.imageLink.endsWith('/')
    );
  }
}
