import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../services/enviroment';
import { timeout } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { TeamService } from '../services/team.service';

interface DtoExerciseAnswer {
  answerText?: string;
  isCorrect: boolean;
}

interface DtoLessonExercise {
  questionText?: string;
  explanation?: string;
  image: File | null; // Required property, value can be null
  answers: DtoExerciseAnswer[];
}

interface DtoLessonExerciseJson {
  questionText?: string;
  explanation?: string;
  answers: DtoExerciseAnswer[];
}
@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './add.html',
  styleUrl: './add.css',
})
export class Add implements OnInit {
  private apiUrl = `${environment.horizon}`;

  activeTab: 'course' | 'lesson' | 'book' | 'slider' | 'suggestion' | 'doctor' = 'course';
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  isSidebarOpen = false;
  submitting = false;

  errorMessage = '';
  successMessage = '';

  courseForm!: FormGroup;
  lessonForm!: FormGroup;
  bookForm!: FormGroup;
  sliderForm!: FormGroup;
  suggestionForm!: FormGroup;
  doctorForm!: FormGroup;

  courses: any[] = []; // Loaded from backend

  // Files
  courseThumbnail: File | null = null;
  lessonVideo: File | null = null;
  lessonVideoPreview: string | null = null;
  lessonDurationInSeconds: number = 0;
  lessonDurationInMinutes: number = 0;
  bookCover: File | null = null;
  bookPdf: File | null = null;
  sliderImage: File | null = null;
  sliderImagePreview: string | null = null;
  suggestionVideo: File | null = null;
  suggestionVideoPreview: string | null = null;
  uploadProgress = 0;

  courseThumbnailPreview: string | null = null;
  bookCoverPreview: string | null = null;
  doctorImage: File | null = null;
  doctorImagePreview: string | null = null;

  //mcq

  showMCQModal = false;
  showMCQListModal = false;
  mcqForm!: FormGroup;
  mcqImage: File | null = null;
  mcqImagePreview: string | null = null;
  lessonExercises: DtoLessonExercise[] = [];
  currentMcqImageFile: File | null = null;
  editingMcqIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private teamService: TeamService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Check Admin Privileges
    const userData: any = this.auth.getUserData();
    this.isAdmin = userData?.isAdmin == 'True' ? true : false;
    if (!this.isAdmin) {
      this.router.navigate(['/home']);
      return;
    }

    this.userName = userData?.firstName + ' ' + userData?.lastName || 'Admin';
    this.initializeForms();
    this.initializeMCQForm();
    this.loadCourses();
  }

  // ------------------------------
  // ✅ Initialize Forms
  // ------------------------------
  initializeForms() {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      price: [0, Validators.required],
      instructorName: ['', Validators.required],
    });

    this.lessonForm = this.fb.group({
      courseId: ['', Validators.required],
      title: ['', Validators.required],
      order: [1, Validators.required],
      isFree: [true, Validators.required],
    });

    this.bookForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      authorName: ['', Validators.required],
      price: [0, Validators.required],
      pages: [0, Validators.required],
    });

    this.sliderForm = this.fb.group({
      title: ['', Validators.required],
      redirectUrl: [''],
    });

    this.suggestionForm = this.fb.group({
      title: ['', Validators.required],
      instructorName: ['', Validators.required],
    });

    this.doctorForm = this.fb.group({
      name: ['', Validators.required],
      specialty: ['', Validators.required],
      about: ['', Validators.required],
      expertise: ['', Validators.required],
      facebook: [''],
      whatsapp: [''],
      instagram: [''],
    });
  }

  initializeMCQForm() {
    this.mcqForm = this.fb.group({
      questionText: ['', Validators.required],
      answerA: ['', Validators.required],
      answerB: ['', Validators.required],
      answerC: ['', Validators.required],
      answerD: ['', Validators.required],
      correctAnswer: ['', Validators.required],
      explanation: ['', Validators.required],
    });
  }

  // ------------------------------
  // ✅ Tabs
  // ------------------------------
  switchTab(tab: 'course' | 'lesson' | 'book' | 'slider' | 'suggestion' | 'doctor') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ------------------------------
  // ✅ Dropdown
  // ------------------------------
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

  // ------------------------------
  // ✅ Load Courses (for lesson select)
  // ------------------------------
  loadCourses() {
    this.http.get(`${this.apiUrl}/GetAllCourses`).subscribe({
      next: (res: any) => {
        this.courses = res;
      },
      error: (err) => {
        console.error('❌ Failed to load courses:', err);
      },
    });
  }

  // ------------------------------
  // ✅ File Handlers
  // ------------------------------
  onThumbnailSelected(event: any, type: 'course' | 'book') {
    const file = event.target.files[0];
    if (!file) return;

    // ✅ Allowed extensions
    const allowedTypes = ['image/jpeg', 'image/png'];

    // ❌ Invalid file type
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Invalid file type! Only PNG and JPG files are allowed.');
      event.target.value = ''; // clear input
      return;
    }

    // ✅ If valid, save and preview
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'course') {
        this.courseThumbnail = file;
        this.courseThumbnailPreview = reader.result as string;
      } else {
        this.bookCover = file;
        this.bookCoverPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  onVideoSelected(event: any, type: 'lesson' | 'suggestion') {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Invalid file type! Only MP4 and WebM are allowed.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'lesson') {
        this.lessonVideo = file;
        this.lessonVideoPreview = reader.result as string;
      } else if (type === 'suggestion') {
        this.suggestionVideo = file;
        this.suggestionVideoPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  onVideoLoadedMetadata(event: any, type: 'lesson' | 'suggestion') {
    if (type === 'lesson') {
      const video = event.target as HTMLVideoElement;
      this.lessonDurationInSeconds = Math.floor(video.duration);
      this.lessonDurationInMinutes = Math.floor(video.duration / 60);
    }
  }

  onBookPdfSelected(event: any) {
    this.bookPdf = event.target.files[0];
  }

  onSliderImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Invalid file type! Only PNG and JPG allowed.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.sliderImage = file;
      this.sliderImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onDoctorImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Invalid file type! Only PNG and JPG allowed.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.doctorImage = file;
      this.doctorImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitSlider() {
    if (!this.sliderImage) {
      this.errorMessage = 'Please upload a slider image.';
      return;
    }

    const formData = new FormData();
    formData.append('title', this.sliderForm.value.title);
    formData.append('file', this.sliderImage);
    formData.append('link', this.sliderForm.value.redirectUrl || '');

    this.submitting = true;

    this.http.post(`${this.apiUrl}/AddSlider`, formData).subscribe({
      next: (res) => {
        this.successMessage = '✅ Slider added successfully!';
        this.submitting = false;
        this.sliderForm.reset();
        this.sliderImage = null;
        this.sliderImagePreview = null;
      },
      error: (err) => {
        this.errorMessage = '❌ Failed to add slider.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  resetSliderForm() {
    this.sliderForm.reset();
    this.sliderImage = null;
    this.sliderImagePreview = null;
  }

  // ------------------------------
  // ✅ Submit Course
  // ------------------------------
  submitCourse() {
    if (this.courseForm.invalid || !this.courseThumbnail) {
      this.errorMessage = 'Please fill in all required fields and upload a thumbnail.';
      return;
    }

    this.submitting = true;

    const formData = new FormData();
    formData.append('courseTitle', this.courseForm.value.title);
    formData.append('courseCreator', this.courseForm.value.instructorName);
    formData.append('coursePrice', this.courseForm.value.price);
    formData.append('courseImage', this.courseThumbnail);

    this.http.post(`${this.apiUrl}/AddNewCourse`, formData).subscribe({
      next: (res) => {
        this.successMessage = '✅ Course added successfully!';
        this.errorMessage = '';
        this.submitting = false;
        this.courseForm.reset();
        this.courseThumbnail = null;
        this.courseThumbnailPreview = null;
        this.loadCourses();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = '❌ Failed to add course.';
        console.error('Course upload error:', err);
      },
    });
  }

  // ------------------------------
  // ✅ Submit Lesson
  // ------------------------------
  submitLesson() {
    if (this.lessonForm.invalid || !this.lessonVideo) {
      this.errorMessage = 'Please fill in all required fields and upload a video.';
      return;
    }

    const formData = new FormData();
    formData.append('title', this.lessonForm.value.title);
    formData.append('isFree', this.lessonForm.value.isFree);
    formData.append('courseId', this.lessonForm.value.courseId);
    formData.append('lessonOrder', this.lessonForm.value.order);
    formData.append('lessonFile', this.lessonVideo);
    formData.append('durationInSeconds', this.lessonDurationInSeconds.toString());

    this.lessonExercises.forEach((exercise, exerciseIndex) => {
      // 1. Define the base key for the current exercise
      const exerciseBaseKey = `lessonExercises[${exerciseIndex}]`;

      // 2. Append non-file properties (question, explanation)
      formData.append(`${exerciseBaseKey}.questionText`, exercise.questionText || '');
      formData.append(`${exerciseBaseKey}.explanation`, exercise.explanation || '');

      // 3. Append the answer list properties
      exercise.answers.forEach((answer, answerIndex) => {
        const answerBaseKey = `${exerciseBaseKey}.answers[${answerIndex}]`;

        formData.append(`${answerBaseKey}.answerText`, answer.answerText || '');
        // Ensure boolean is converted to a string for form data binding
        formData.append(`${answerBaseKey}.isCorrect`, answer.isCorrect.toString());
      });

      // 4. Append the exercise image file
      if (exercise.image) {
        // The file key remains the same, which will successfully bind the IFormFile property
        const fileKey = `${exerciseBaseKey}.image`;
        formData.append(fileKey, exercise.image, exercise.image.name);
      }
    });
    this.submitting = true;
    this.uploadProgress = 0;

    this.http
      .post(`${this.apiUrl}/AddLesson`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(timeout(0))
      .subscribe({
        next: (event: any) => {
          if (event.type === 1 && event.total) {
            this.uploadProgress = Math.round((100 * event.loaded) / event.total);
          } else if (event.type === 4) {
            this.successMessage = '✅ Lesson uploaded successfully!';
            this.errorMessage = '';
            this.submitting = false;
            this.lessonForm.reset();
            this.lessonVideo = null;
            this.lessonVideoPreview = null;
            this.lessonDurationInSeconds = 0;
            this.uploadProgress = 0;
            this.lessonExercises = []; // Clear MCQs after successful submission
          }
        },
        error: (err) => {
          this.submitting = false;
          this.uploadProgress = 0;
          this.errorMessage = '❌ Failed to upload lesson.';
          console.error(err);
        },
      });
  }

  addMCQ() {
    // If no MCQs exist, open the add MCQ modal directly
    // Otherwise, open the list modal to view/edit existing MCQs
    if (this.lessonExercises.length === 0) {
      this.showMCQModal = true;
      this.editingMcqIndex = null;
    } else {
      this.showMCQListModal = true;
    }
  }

  closeMCQModal() {
    this.showMCQModal = false;
    this.editingMcqIndex = null;
    this.resetMcqModal();
  }

  openMCQListModal() {
    this.showMCQListModal = true;
  }

  closeMCQListModal() {
    this.showMCQListModal = false;
  }

  addNewMCQFromList() {
    this.editingMcqIndex = null;
    this.resetMcqModal();
    this.showMCQListModal = false;
    this.showMCQModal = true;
  }

  editMCQ(index: number) {
    const exercise = this.lessonExercises[index];
    if (!exercise) return;

    // Find the correct answer
    const correctAnswerIndex = exercise.answers.findIndex((ans) => ans.isCorrect === true);
    const correctAnswerLetter =
      correctAnswerIndex >= 0 ? ['A', 'B', 'C', 'D'][correctAnswerIndex] : 'A';

    // Populate the form with existing data
    this.mcqForm.patchValue({
      questionText: exercise.questionText || '',
      answerA: exercise.answers[0]?.answerText || '',
      answerB: exercise.answers[1]?.answerText || '',
      answerC: exercise.answers[2]?.answerText || '',
      answerD: exercise.answers[3]?.answerText || '',
      correctAnswer: correctAnswerLetter,
      explanation: exercise.explanation || '',
    });

    // Handle image preview
    if (exercise.image) {
      this.currentMcqImageFile = exercise.image;
      // Create preview if it's an image
      if (exercise.image.type && exercise.image.type !== 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => {
          this.mcqImagePreview = reader.result as string;
        };
        reader.readAsDataURL(exercise.image);
      } else {
        this.mcqImagePreview = null;
      }
    } else {
      this.currentMcqImageFile = null;
      this.mcqImagePreview = null;
    }

    this.editingMcqIndex = index;
    this.showMCQListModal = false;
    this.showMCQModal = true;
  }

  deleteMCQ(index: number) {
    if (confirm('Are you sure you want to delete this MCQ?')) {
      this.lessonExercises.splice(index, 1);
    }
  }

  onMCQImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file) {
      this.currentMcqImageFile = file; // UPDATE THIS LINE: Store the actual file object

      // For preview purposes (assuming mcqImagePreview exists)
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.mcqImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.currentMcqImageFile = null; // Reset if file selection is cancelled
      this.mcqImagePreview = null;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Invalid file type! Only PNG, JPEG, and PDF allowed.');
      event.target.value = '';
      return;
    }

    this.mcqImage = file;

    // Only preview images, not PDFs
    if (file.type !== 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        this.mcqImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.mcqImagePreview = null;
    }
  }

  saveMCQ() {
    if (this.mcqForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const formValue = this.mcqForm.value;
    // 1. Map the four answers into the DtoExerciseAnswer list
    const answers: DtoExerciseAnswer[] = [
      {
        answerText: formValue.answerA,
        isCorrect: formValue.correctAnswer === 'A', // True if the selected radio button is 'A'
      },
      {
        answerText: formValue.answerB,
        isCorrect: formValue.correctAnswer === 'B',
      },
      {
        answerText: formValue.answerC,
        isCorrect: formValue.correctAnswer === 'C',
      },
      {
        answerText: formValue.answerD,
        isCorrect: formValue.correctAnswer === 'D',
      },
    ];

    // 2. Create the DtoLessonExercise object
    const exercise: DtoLessonExercise = {
      questionText: formValue.questionText,
      explanation: formValue.explanation,
      image: this.currentMcqImageFile, // Use the stored File object
      answers: answers,
    };

    // 3. Either update existing or add new
    if (this.editingMcqIndex !== null && this.editingMcqIndex >= 0) {
      // Update existing MCQ
      this.lessonExercises[this.editingMcqIndex] = exercise;
    } else {
      // Add new MCQ
      this.lessonExercises.push(exercise);
    }

    const wasEditing = this.editingMcqIndex !== null;
    this.resetMcqModal();
    this.closeMCQModal();

    // If we were editing from the list modal, reopen it after saving
    if (wasEditing) {
      this.showMCQListModal = true;
    }
  }

  resetMcqModal(): void {
    // Reset the form group to clear all inputs
    this.mcqForm.reset();

    // Explicitly reset file-related properties
    this.currentMcqImageFile = null;
    this.mcqImagePreview = null;
    this.mcqImage = null;
    this.editingMcqIndex = null;

    // Also reset the file input element in the DOM if possible,
    // or handle file input clearing logic in the HTML/Template
  }

  submitMCQList() {
    // Close the list modal when submit is clicked
    this.closeMCQListModal();
  }

  // ------------------------------
  // ✅ Submit Book
  // ------------------------------
  submitBook() {
    if (this.bookForm.invalid || !this.bookPdf || !this.bookCover) {
      this.errorMessage = 'Please fill in all required fields and upload files.';
      return;
    }

    const formData = new FormData();
    Object.entries(this.bookForm.value).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append('bookFile', this.bookPdf);
    formData.append('bookImage', this.bookCover);

    this.submitting = true;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken()}`,
    });

    this.http.post(`${this.apiUrl}/AddBook`, formData, { headers }).subscribe({
      next: (res) => {
        this.successMessage = '✅ Book added successfully!';
        this.errorMessage = '';
        this.submitting = false;
        this.bookForm.reset();
        this.bookPdf = null;
        this.bookCover = null;
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = '❌ Failed to add book.';
        console.error(err);
      },
    });
  }

  submitSuggestion() {
    if (this.suggestionForm.invalid || !this.suggestionVideo) {
      this.errorMessage = 'Please fill in all fields and upload a video.';
      return;
    }

    const formData = new FormData();
    formData.append('title', this.suggestionForm.value.title);
    formData.append('instructorName', this.suggestionForm.value.instructorName);
    formData.append('file', this.suggestionVideo);

    this.submitting = true;
    this.uploadProgress = 0;

    this.http
      .post(`${this.apiUrl}/AddSuggestVideo`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .subscribe({
        next: (event: any) => {
          if (event.type === 1 && event.total) {
            // Upload progress event
            this.uploadProgress = Math.round((100 * event.loaded) / event.total);
          } else if (event.type === 4) {
            // Upload complete
            this.successMessage = '✅ Suggestion added successfully!';
            this.errorMessage = '';
            this.suggestionForm.reset();
            this.suggestionVideo = null;
            this.suggestionVideoPreview = null;
            this.uploadProgress = 0;
            this.submitting = false;
          }
        },
        error: (err) => {
          this.errorMessage = '❌ Failed to upload suggestion.';
          console.error('Upload error:', err);
          this.uploadProgress = 0;
          this.submitting = false;
        },
      });
  }

  resetSuggestionForm() {
    this.suggestionForm.reset();
    this.suggestionVideo = null;
  }

  // ------------------------------
  // ✅ Reset Forms
  // ------------------------------
  resetCourseForm() {
    this.courseForm.reset();
    this.courseThumbnail = null;
  }

  resetLessonForm() {
    this.lessonForm.reset();
    this.lessonVideo = null;
    this.lessonExercises = []; // Clear MCQs when form is reset
  }

  resetBookForm() {
    this.bookForm.reset();
    this.bookCover = null;
    this.bookPdf = null;
  }

  resetDoctorForm() {
    this.doctorForm.reset();
    this.doctorImage = null;
    this.doctorImagePreview = null;
  }

  submitDoctor() {
    if (this.doctorForm.invalid || !this.doctorImage) {
      this.errorMessage = 'Please fill in all required fields and upload an image.';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.doctorForm.value.name);
    formData.append('specialty', this.doctorForm.value.specialty);
    formData.append('description', this.doctorForm.value.about);
    formData.append('expertise', this.doctorForm.value.expertise);
    formData.append('facebookUrl', this.doctorForm.value.facebook);
    formData.append('whatsappUrl', this.doctorForm.value.whatsapp);
    formData.append('instgramUrl', this.doctorForm.value.instagram);
    formData.append('image', this.doctorImage);

    this.submitting = true;

    this.teamService.addInstructor(formData).subscribe({
      next: (res) => {
        this.successMessage = '✅ Doctor added successfully!';
        this.errorMessage = '';
        this.submitting = false;
        this.resetDoctorForm();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = '❌ Failed to add doctor.';
        console.error('Doctor upload error:', err);
      }
    });
  }

  goBackToHome() {
    this.router.navigate(['/home']);
  }
}
