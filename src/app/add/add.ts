import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../services/enviroment';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './add.html',
  styleUrl: './add.css',
})
export class Add implements OnInit {
  private apiUrl = `${environment.horizon}`;

  activeTab: 'course' | 'lesson' | 'book' | 'slider' | 'suggestion' = 'course';
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  submitting = false;

  errorMessage = '';
  successMessage = '';

  courseForm!: FormGroup;
  lessonForm!: FormGroup;
  bookForm!: FormGroup;
  sliderForm!: FormGroup;
  suggestionForm!: FormGroup;

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

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
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
  }

  // ------------------------------
  // ✅ Tabs
  // ------------------------------
  switchTab(tab: 'course' | 'lesson' | 'book' | 'slider' | 'suggestion') {
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
    formData.append('lessonFile', this.lessonVideo);
    formData.append('durationInSeconds', this.lessonDurationInSeconds.toString());

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
  }

  resetBookForm() {
    this.bookForm.reset();
    this.bookCover = null;
    this.bookPdf = null;
  }
}
