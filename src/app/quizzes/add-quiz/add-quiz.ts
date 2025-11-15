import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { QuizService, DtoAddExam, DtoExamQuestion } from '../../services/quiz.service';
import { ToasterService } from '../../services/toaster.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-add-quiz',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './add-quiz.html',
  styleUrls: ['./add-quiz.css'],
})
export class AddQuizComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  isSidebarOpen = false;
  submitting = false;
  submittingQuestions = false;
  examId: number | null = null;
  courses: any[] = [];
  loadingCourses = false;

  quizForm!: FormGroup;
  questionsFormArray!: FormArray;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private quizService: QuizService,
    private toaster: ToasterService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const userData: any = this.auth.getUserData();
    this.isAdmin = userData?.isAdmin == 'True' ? true : false;
    if (!this.isAdmin) {
      this.router.navigate(['/quizzes']);
      return;
    }

    this.userName = userData?.firstName + ' ' + userData?.lastName || 'Admin';
    this.initializeForm();
    this.loadCourses();
  }

  loadCourses() {
    this.loadingCourses = true;
    this.quizService.getAllCourses().subscribe({
      next: (res: any) => {
        this.courses = Array.isArray(res) ? res : res?.data || [];
        this.loadingCourses = false;
      },
      error: (err) => {
        console.error('Failed to load courses:', err);
        this.toaster.showError('Failed to load courses');
        this.loadingCourses = false;
      },
    });
  }

  initializeForm() {
    this.quizForm = this.fb.group({
      examTitle: ['', Validators.required],
      startTime: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      courseId: ['', Validators.required],
      questions: this.fb.array([]),
    });

    this.questionsFormArray = this.quizForm.get('questions') as FormArray;
    this.addQuestion();
  }

  get questions() {
    return this.quizForm.get('questions') as FormArray;
  }

  addQuestion() {
    const questionGroup = this.fb.group({
      questionText: ['', Validators.required],
      Mark: [1, [Validators.required, Validators.min(0.5)]],
      options: this.fb.array([
        this.createOption(),
        this.createOption(),
        this.createOption(),
        this.createOption(),
      ]),
    });

    this.questions.push(questionGroup);
  }

  removeQuestion(index: number) {
    if (this.questions.length > 1) {
      this.questions.removeAt(index);
    } else {
      this.toaster.showError('Quiz must have at least one question');
    }
  }

  getOptions(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('options') as FormArray;
  }

  createOption() {
    return this.fb.group({
      answerText: ['', Validators.required],
      isCorrect: [false],
    });
  }

  addOption(questionIndex: number) {
    const options = this.getOptions(questionIndex);
    if (options.length < 6) {
      options.push(this.createOption());
    } else {
      this.toaster.showError('Maximum 6 options per question');
    }
  }

  removeOption(questionIndex: number, optionIndex: number) {
    const options = this.getOptions(questionIndex);
    if (options.length > 2) {
      options.removeAt(optionIndex);
    } else {
      this.toaster.showError('Each question must have at least 2 options');
    }
  }

  onCorrectAnswerChange(questionIndex: number, optionIndex: number) {
    const options = this.getOptions(questionIndex);
    options.controls.forEach((control, index) => {
      if (index !== optionIndex) {
        control.patchValue({ isCorrect: false });
      } else {
        control.patchValue({ isCorrect: true });
      }
    });
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

  validateQuizDetails(): boolean {
    this.quizForm.get('examTitle')?.markAsTouched();
    this.quizForm.get('startTime')?.markAsTouched();
    this.quizForm.get('duration')?.markAsTouched();
    this.quizForm.get('courseId')?.markAsTouched();

    if (this.quizForm.get('examTitle')?.invalid) {
      this.toaster.showError('Please enter a quiz title');
      return false;
    }
    if (this.quizForm.get('startTime')?.invalid) {
      this.toaster.showError('Please select a start time');
      return false;
    }
    if (this.quizForm.get('duration')?.invalid) {
      this.toaster.showError('Please enter a valid duration (minimum 1 minute)');
      return false;
    }
    if (this.quizForm.get('courseId')?.invalid) {
      this.toaster.showError('Please select a course');
      return false;
    }
    return true;
  }

  validateQuestions(): boolean {
    // Check if there are questions
    if (this.questions.length === 0) {
      this.toaster.showError('Please add at least one question');
      return false;
    }

    // Check each question
    for (let i = 0; i < this.questions.length; i++) {
      const question = this.questions.at(i);
      question.markAllAsTouched();

      if (question.invalid) {
        if (!question.get('questionText')?.valid) {
          this.toaster.showError(`Question ${i + 1}: Please enter question text`);
        } else if (!question.get('Mark')?.valid) {
          this.toaster.showError(`Question ${i + 1}: Please enter a valid mark (minimum 0.5)`);
        } else {
          this.toaster.showError(`Question ${i + 1} is incomplete`);
        }
        return false;
      }

      // Check options
      const options = this.getOptions(i);
      if (options.length < 2) {
        this.toaster.showError(`Question ${i + 1}: Please add at least 2 answer options`);
        return false;
      }

      // Check if all options have text
      for (let j = 0; j < options.length; j++) {
        const option = options.at(j);
        option.markAllAsTouched();
        if (!option.get('answerText')?.valid) {
          this.toaster.showError(`Question ${i + 1}, Option ${j + 1}: Please enter option text`);
          return false;
        }
      }

      // Check if at least one option is marked as correct
      const hasCorrectAnswer = options.controls.some(
        (control) => control.get('isCorrect')?.value === true
      );

      if (!hasCorrectAnswer) {
        this.toaster.showError(`Question ${i + 1}: Please mark at least one answer as correct`);
        return false;
      }
    }

    return true;
  }

  submitQuizDetails() {
    if (!this.validateQuizDetails()) {
      return;
    }

    this.submitting = true;
    const formValue = this.quizForm.value;
    const examData: DtoAddExam = {
      examTitle: formValue.examTitle,
      startTime: new Date(formValue.startTime).toISOString(),
      duration: parseInt(formValue.duration),
      courseId: parseInt(formValue.courseId),
    };

    this.quizService.addExam(examData).subscribe({
      next: (res: any) => {
        this.submitting = false;
        
        if (res?.status === 200 && res?.data) {
          const examData = res.data;
          this.examId = examData.id;
          this.toaster.showSuccess('Quiz created successfully! Now add questions below.');
          
          // Scroll to questions section
          setTimeout(() => {
            const questionsSection = document.getElementById('questions-section');
            if (questionsSection) {
              questionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 500);
        } else {
          this.toaster.showError(res?.data || 'Failed to create quiz. Please try again.');
        }
      },
      error: (err) => {
        console.error('Failed to create quiz:', err);
        this.submitting = false;
        this.toaster.showError('Failed to create quiz. Please try again.');
      },
    });
  }

  submitQuestions() {
    if (!this.examId) {
      this.toaster.showError('Please create the quiz first');
      return;
    }

    if (!this.validateQuestions()) {
      return;
    }

    this.submittingQuestions = true;
    const formValue = this.quizForm.value;
    const questions: DtoExamQuestion[] = formValue.questions.map((q: any) => ({
      questionText: q.questionText,
      Mark: parseFloat(q.Mark),
      options: q.options.map((opt: any) => ({
        answerText: opt.answerText,
        isCorrect: opt.isCorrect,
      })),
    }));

    this.quizService
      .addExamQuestions({
        examId: this.examId,
        questions: questions,
      })
      .subscribe({
        next: (questionsRes: any) => {
          this.submittingQuestions = false;
          if (questionsRes?.status === 200) {
            this.toaster.showSuccess('Quiz created successfully with all questions!');
            setTimeout(() => {
              this.router.navigate(['/quizzes']);
            }, 2000);
          } else {
            this.toaster.showError(questionsRes?.data || 'Failed to add questions');
          }
        },
        error: (err) => {
          console.error('Failed to add questions:', err);
          this.submittingQuestions = false;
          this.toaster.showError('Failed to add questions. Please try again.');
        },
      });
  }

  cancel() {
    this.router.navigate(['/quizzes']);
  }
}
