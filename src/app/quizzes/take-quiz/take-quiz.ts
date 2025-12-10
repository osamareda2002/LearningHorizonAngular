import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import {
  QuizService,
  DtoGetExamQuestions,
  DtoExamQuestion,
  DtoQuestionAnswer,
  DtoReturnExamScore,
} from '../../services/quiz.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-take-quiz',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './take-quiz.html',
  styleUrls: ['./take-quiz.css'],
})
export class TakeQuizComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isSidebarOpen = false;
  isLoading = false;
  errorMessage = '';
  examId: number = 0;

  examTitle: string = '';
  questions: DtoExamQuestion[] = [];
  currentQuestionIndex: number = 0;
  selectedAnswers: Map<number, number> = new Map(); // questionId -> answerId
  pendingSubmission: { questionId: number; answerId: number } | null = null;

  timeRemaining: number = 0; // in seconds
  timerInterval: any = null;
  examStartTime: Date | null = null;
  examDuration: number = 0; // in minutes
  examEndTime: Date | null = null;

  showFinishConfirmation = false;
  examScore: DtoReturnExamScore | null = null;
  showResults = false;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private quizService: QuizService
  ) {}

  // Disable keyboard shortcuts for copying
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Disable Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+S, Ctrl+P, F12, Ctrl+Shift+I
    if (
      (event.ctrlKey && (event.key === 'c' || event.key === 'C')) ||
      (event.ctrlKey && (event.key === 'a' || event.key === 'A')) ||
      (event.ctrlKey && (event.key === 'x' || event.key === 'X')) ||
      (event.ctrlKey && (event.key === 's' || event.key === 'S')) ||
      (event.ctrlKey && (event.key === 'p' || event.key === 'P')) ||
      (event.ctrlKey && (event.key === 'u' || event.key === 'U')) ||
      event.key === 'F12' ||
      (event.ctrlKey && event.shiftKey && (event.key === 'i' || event.key === 'I')) ||
      (event.ctrlKey && event.shiftKey && (event.key === 'j' || event.key === 'J')) ||
      (event.ctrlKey && event.shiftKey && (event.key === 'c' || event.key === 'C'))
    ) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Disable right-click context menu
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
    return false;
  }

  // Disable text selection via drag
  @HostListener('selectstart', ['$event'])
  onSelectStart(event: Event) {
    const target = event.target as HTMLElement;
    // Allow selection in input fields but not in question/answer areas
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      return false;
    }
    return true;
  }

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const userData: any = this.auth.getUserData();
    this.isAdmin = userData?.isAdmin == 'True' ? true : false;
    this.userName = userData?.firstName + ' ' + userData?.lastName || 'User';

    this.route.params.subscribe((params) => {
      this.examId = +params['id'];
      if (this.examId) {
        this.loadQuiz();
      }
    });
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadQuiz() {
    this.isLoading = true;
    this.errorMessage = '';

    // First, get exam details to check currentQuestionId
    this.quizService.getUpcomingExams().subscribe({
      next: (examsRes: any) => {
        const exams = Array.isArray(examsRes) ? examsRes : examsRes?.data || [];
        const exam = exams.find((e: any) => e.id === this.examId);

        if (exam) {
          this.examStartTime = new Date(exam.startTime);
          this.examDuration = exam.durationInMinutes || 30;
          this.examEndTime = new Date(this.examStartTime.getTime() + this.examDuration * 60000);
          this.startTimer();

          // Load questions
          this.quizService.getExamQuestions(this.examId).subscribe({
            next: (res: any) => {
              const data = res?.data || res;
              if (!data) {
                this.errorMessage = 'Failed to load quiz';
                this.isLoading = false;
                return;
              }

              this.examTitle = data.examTitle || 'Quiz';
              this.questions = data.questions || [];

              // Resume from currentQuestionId if available
              const currentQuestionId = exam.currentQuestionId || 0;
              if (currentQuestionId > 0) {
                const resumeIndex = this.questions.findIndex(
                  (q) => q.questionId === currentQuestionId
                );
                if (resumeIndex >= 0) {
                  this.currentQuestionIndex = resumeIndex;
                }
              } else {
                this.currentQuestionIndex = 0;
              }

              this.isLoading = false;
            },
            error: (err) => {
              console.error('Failed to load quiz:', err);
              this.errorMessage = 'Failed to load quiz. Please try again.';
              this.isLoading = false;
            },
          });
        } else {
          this.errorMessage = 'Exam not found';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load exam details:', err);
        this.errorMessage = 'Failed to load exam details. Please try again.';
        this.isLoading = false;
      },
    });
  }

  startTimer() {
    if (!this.examEndTime) return;

    this.updateTimeRemaining();

    this.timerInterval = setInterval(() => {
      this.updateTimeRemaining();

      if (this.timeRemaining <= 0) {
        this.autoSubmit();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimeRemaining() {
    if (!this.examEndTime) {
      this.timeRemaining = 0;
      return;
    }

    const now = Date.now();
    const end = this.examEndTime.getTime();

    let diffMs = end - now;

    if (diffMs < 0) {
      diffMs = 0;
    }

    this.timeRemaining = Math.floor(diffMs / 1000);

    if (this.timeRemaining === 0 && !this.isSubmitting) {
      this.autoSubmit();
    }
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getTimerClass(): string {
    if (this.timeRemaining <= 60) {
      return 'timer-critical';
    } else if (this.timeRemaining <= 300) {
      return 'timer-warning';
    }
    return 'timer-normal';
  }

  getCurrentQuestion(): DtoExamQuestion | null {
    if (this.questions.length === 0 || this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  selectAnswer(questionId: number, answerId: number) {
    if (this.showResults || this.showFinishConfirmation) return;
    this.selectedAnswers.set(questionId, answerId);
  }

  isAnswerSelected(questionId: number, answerId: number): boolean {
    return this.selectedAnswers.get(questionId) === answerId;
  }

  nextQuestion() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion || !currentQuestion.questionId) return;

    const selectedAnswerId = this.selectedAnswers.get(currentQuestion.questionId);
    if (!selectedAnswerId) {
      this.errorMessage = 'Please select an answer before proceeding';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      return;
    }

    // Store pending submission
    this.pendingSubmission = {
      questionId: currentQuestion.questionId,
      answerId: selectedAnswerId,
    };

    // Submit answer asynchronously first
    this.submitAnswer();

    // Move to next question immediately (optimistic update)
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.errorMessage = '';
    } else {
      // All questions answered, show finish confirmation
      this.showFinishConfirmation = true;
    }
  }

  submitAnswer() {
    if (!this.pendingSubmission) return;

    this.isSubmitting = true;
    this.quizService
      .submitExamAnswers({
        examId: this.examId,
        questionId: this.pendingSubmission.questionId,
        answerId: this.pendingSubmission.answerId,
      })
      .subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          if (res?.status === 400 || res?.status !== 200) {
            this.errorMessage = res?.data || 'Failed to submit answer. Please try again.';
            if (this.currentQuestionIndex > 0) {
              this.currentQuestionIndex--;
            }
            if (this.pendingSubmission) {
              this.selectedAnswers.set(
                this.pendingSubmission.questionId,
                this.pendingSubmission.answerId
              );
            }
            this.pendingSubmission = null;
          } else {
            this.pendingSubmission = null;
          }
        },
        error: (err) => {
          console.error('Failed to submit answer:', err);
          this.isSubmitting = false;
          this.errorMessage = 'Failed to submit answer. Please try again.';
          if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          }
          if (this.pendingSubmission) {
            this.selectedAnswers.set(
              this.pendingSubmission.questionId,
              this.pendingSubmission.answerId
            );
          }
          this.pendingSubmission = null;
        },
      });
  }

  confirmFinish() {
    this.isLoading = true;
    this.errorMessage = '';

    this.quizService.finishExam(this.examId).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.quizService.getExamResults(this.examId).subscribe({
            next: (resultsRes: any) => {
              this.isLoading = false;
              if (resultsRes?.status === 200 && resultsRes?.data) {
                this.examScore = resultsRes.data;
                this.showFinishConfirmation = false;
                this.showResults = true;
                this.stopTimer();
              } else {
                this.errorMessage = resultsRes?.data || 'Failed to load results';
              }
            },
            error: (err) => {
              console.error('Failed to get exam results:', err);
              this.isLoading = false;
              this.errorMessage = 'Failed to load exam results. Please try again.';
            },
          });
        } else {
          this.isLoading = false;
          this.errorMessage = res?.data || 'Failed to finish exam';
        }
      },
      error: (err) => {
        console.error('Failed to finish exam:', err);
        this.isLoading = false;
        this.errorMessage = 'Failed to finish exam. Please try again.';
      },
    });
  }

  cancelFinish() {
    this.showFinishConfirmation = false;
    if (this.currentQuestionIndex >= this.questions.length) {
      this.currentQuestionIndex = this.questions.length - 1;
    }
  }

  autoSubmit() {
    if (this.showResults || this.showFinishConfirmation) return;

    this.stopTimer();
    this.confirmFinish();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/quizzes']);
  }
}
