import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { QuizService, DtoGetExam } from '../services/quiz.service';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import moment from 'moment';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './quizzes.html',
  styleUrls: ['./quizzes.css'],
})
export class QuizzesComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  isSidebarOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  upcomingExams: DtoGetExam[] = [];
  allExams: DtoGetExam[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private quizService: QuizService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const userData: any = this.auth.getUserData();
    this.isAdmin = userData?.isAdmin == 'True' ? true : false;
    this.userName = userData?.firstName + ' ' + userData?.lastName || 'User';

    this.loadExams();
  }

  loadExams() {
    this.isLoading = true;
    this.errorMessage = '';

    // Load upcoming exams for regular users
    this.quizService.getUpcomingExams().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        this.upcomingExams = data.map((exam: any) => this.enrichExam(exam));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load upcoming exams:', err);
        this.errorMessage = 'Failed to load quizzes';
        this.isLoading = false;
      },
    });

    // Load all exams for admins
    if (this.isAdmin) {
      this.quizService.getAllExams().subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : res?.data || [];
          this.allExams = data.map((exam: any) => this.enrichExam(exam));
        },
        error: (err) => {
          console.error('Failed to load all exams:', err);
        },
      });
    }
  }

  private enrichExam(exam: any): DtoGetExam {
    return {
      ...exam,
      startTime: exam.startTime ? new Date(exam.startTime) : null,
    };
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  openAddQuiz() {
    this.router.navigate(['/quizzes/add']);
  }

  takeQuiz(exam: DtoGetExam) {
    if (!exam.id) return;
    this.router.navigate(['/quizzes/take', exam.id]);
  }

  deleteQuiz(exam: DtoGetExam) {
    if (!exam.id) return;
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    this.quizService.deleteExam(exam.id).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          this.successMessage = 'Quiz deleted successfully';
          this.loadExams();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        } else {
          this.errorMessage = res?.data || 'Failed to delete quiz';
          setTimeout(() => {
            this.errorMessage = '';
          }, 3000);
        }
      },
      error: (err) => {
        console.error('Failed to delete quiz:', err);
        this.errorMessage = 'Failed to delete quiz';
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      },
    });
  }

  getExamStatus(exam: DtoGetExam): 'not-started' | 'running-not-started' | 'running-started' | 'finished' {
    if (!exam.startTime) return 'not-started';
    const startTime = moment(exam.startTime);
    const now = moment();
    const duration = exam.durationInMinutes || 0;
    const endTime = startTime.clone().add(duration, 'minutes');

    // Check if exam has finished
    if (exam.userFinished || (now > endTime)) {
      return 'finished';
    }

    // Check if exam hasn't started yet
    if (now < startTime) {
      return 'not-started';
    }

    // Exam is running
    if (now >= startTime && now <= endTime) {
      // Check if user has started the exam
      const currentQuestionId = exam.currentQuestionId || 0;
      if (currentQuestionId === 0) {
        return 'running-not-started';
      } else {
        return 'running-started';
      }
    }

    return 'finished';
  }

  canTakeQuiz(exam: DtoGetExam): boolean {
    const status = this.getExamStatus(exam);
    return status === 'running-not-started' || status === 'running-started';
  }

  getExamStatusText(exam: DtoGetExam): string {
    const status = this.getExamStatus(exam);
    switch (status) {
      case 'not-started':
        return 'Not Started';
      case 'running-not-started':
        return 'Running - Start Exam';
      case 'running-started':
        return 'Running - Resume Exam';
      case 'finished':
        return 'Finished';
      default:
        return 'Unknown';
    }
  }

  getTimeUntilStart(exam: DtoGetExam): string {
    if (!exam.startTime) return 'Unknown';
    const startTime = new Date(exam.startTime);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();

    if (diffMs <= 0) return 'Started';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    }
  }

  getTimeRemaining(exam: DtoGetExam): string {
    if (!exam.startTime || !exam.durationInMinutes) return 'Unknown';
    const startTime = new Date(exam.startTime);
    const duration = exam.durationInMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();

    if (diffMs <= 0) return 'Finished';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  }

  getExamsToShow(): DtoGetExam[] {
    return this.isAdmin ? this.allExams : this.upcomingExams;
  }
}

