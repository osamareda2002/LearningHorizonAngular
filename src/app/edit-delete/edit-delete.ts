import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../services/enviroment';

@Component({
  selector: 'app-edit-delete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-delete.html',
  styleUrl: './edit-delete.css',
})
export class EditDelete implements OnInit {
  private apiUrl = `${environment.horizon}`;

  activeTab: 'course' | 'lesson' | 'slider' | 'suggestion' = 'course';
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  submitting = false;
  isSidebarOpen = false;
  errorMessage = '';
  successMessage = '';

  // Lists
  courses: any[] = [];
  lessons: any[] = [];
  sliders: any[] = [];
  suggestions: any[] = [];

  // Filter
  selectedCourseId: string = '';

  // Loading states
  loadingCourses = false;
  loadingLessons = false;
  loadingSliders = false;
  loadingSuggestions = false;

  // Forms
  editCourseForm!: FormGroup;
  editLessonForm!: FormGroup;
  editSliderForm!: FormGroup;
  editSuggestionForm!: FormGroup;

  // Modal states
  showEditCourseModal = false;
  showEditLessonModal = false;
  showEditSliderModal = false;
  showEditSuggestionModal = false;
  showDeleteConfirm = false;

  // Current item data
  currentEditCourse: any = null;
  currentEditLesson: any = null;
  currentEditSlider: any = null;
  currentEditSuggestion: any = null;
  currentDeleteItem: any = null;
  deleteType: 'course' | 'lesson' | 'slider' | 'suggestion' | null = null;

  // File uploads
  editCourseImage: File | null = null;
  editCourseImagePreview: string | null = null;
  editSliderImage: File | null = null;
  editSliderImagePreview: string | null = null;

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

    const userData: any = this.auth.getUserData();
    this.isAdmin = userData?.isAdmin == 'True' ? true : false;
    if (!this.isAdmin) {
      this.router.navigate(['/home']);
      return;
    }

    this.userName = userData?.firstName + ' ' + userData?.lastName || 'Admin';
    this.initializeForms();
    this.loadAllData();
  }

  initializeForms() {
    this.editCourseForm = this.fb.group({
      title: ['', Validators.required],
      price: [0, Validators.required],
      instructorName: ['', Validators.required],
    });

    this.editLessonForm = this.fb.group({
      title: ['', Validators.required],
      order: [1, Validators.required],
      isFree: [true, Validators.required],
    });

    this.editSliderForm = this.fb.group({
      title: ['', Validators.required],
      redirectUrl: [''],
    });

    this.editSuggestionForm = this.fb.group({
      title: ['', Validators.required],
    });
  }

  switchTab(tab: 'course' | 'lesson' | 'slider' | 'suggestion') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
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

  // ✅ Load all data
  loadAllData() {
    this.loadCourses();
    // Don't load all lessons on init - wait for course selection
    this.loadSliders();
    this.loadSuggestions();
  }

  loadCourses() {
    this.loadingCourses = true;
    this.http.get(`${this.apiUrl}/GetAllCourses`).subscribe({
      next: (res: any) => {
        this.courses = res || [];
        this.loadingCourses = false;
      },
      error: (err) => {
        console.error('Failed to load courses:', err);
        this.loadingCourses = false;
      },
    });
  }

  loadLessons() {
    if (!this.selectedCourseId) {
      this.lessons = [];
      return;
    }

    this.loadingLessons = true;
    this.lessons = [];

    this.http
      .get(`${this.apiUrl}/GetLessonsByCourseId?courseId=${this.selectedCourseId}`)
      .subscribe({
        next: (res: any) => {
          this.lessons = [...res];
          this.loadingLessons = false;
        },
        error: (err) => {
          console.error('Failed to load lessons:', err);
          this.lessons = [];
          this.loadingLessons = false;
        },
      });
  }

  // Course filter change handler
  onCourseFilterChange(event: any) {
    this.selectedCourseId = event.target.value;
    this.lessons = [];
    if (this.selectedCourseId) {
      this.loadLessons();
    }
  }

  // Format duration helper
  formatDuration(minutes: number): string {
    if (!minutes) return '0 Min';
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  loadSliders() {
    this.loadingSliders = true;
    this.http.get(`${this.apiUrl}/GetAllSliders`).subscribe({
      next: (res: any) => {
        this.sliders = res || [];
        this.loadingSliders = false;
      },
      error: (err) => {
        console.error('Failed to load sliders:', err);
        this.loadingSliders = false;
      },
    });
  }

  loadSuggestions() {
    this.loadingSuggestions = true;
    this.http.get(`${this.apiUrl}/GetAllSuggestions`).subscribe({
      next: (res: any) => {
        this.suggestions = res || [];
        this.loadingSuggestions = false;
      },
      error: (err) => {
        console.error('Failed to load suggestions:', err);
        this.loadingSuggestions = false;
      },
    });
  }

  // ✅ Edit Course
  openEditCourseModal(course: any) {
    this.currentEditCourse = course;
    this.editCourseForm.patchValue({
      title: course.courseTitle,
      price: course.coursePrice,
      instructorName: course.courseCreator,
    });
    this.editCourseImagePreview = course.courseImage;
    this.editCourseImage = null;
    this.showEditCourseModal = true;
  }

  onCourseImageChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type! Only PNG and JPG files are allowed.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.editCourseImage = file;
      this.editCourseImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitEditCourse() {
    if (this.editCourseForm.invalid || !this.currentEditCourse) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const formData = new FormData();
    formData.append('courseId', this.currentEditCourse.courseId);
    formData.append('courseTitle', this.editCourseForm.value.title);
    formData.append('courseCreator', this.editCourseForm.value.instructorName);
    formData.append('coursePrice', this.editCourseForm.value.price);

    if (this.editCourseImage) {
      formData.append('courseImage', this.editCourseImage);
    }

    this.http.put(`${this.apiUrl}/UpdateCourse`, formData).subscribe({
      next: (res) => {
        this.successMessage = 'Course updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadCourses();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update course.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  // ✅ Edit Lesson
  openEditLessonModal(lesson: any) {
    this.currentEditLesson = lesson;
    this.editLessonForm.patchValue({
      title: lesson.title,
      order: lesson.arrange,
      isFree: lesson.isFree,
    });
    this.showEditLessonModal = true;
  }

  submitEditLesson() {
    if (this.editLessonForm.invalid || !this.currentEditLesson) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const formData = new FormData();
    formData.append('id', this.currentEditLesson.id);
    formData.append('title', this.editLessonForm.value.title);
    formData.append('order', this.editLessonForm.value.order);
    formData.append('isFree', this.editLessonForm.value.isFree);
    formData.append('courseId', this.currentEditLesson.courseId);

    this.http.post(`${this.apiUrl}/EditLesson`, formData).subscribe({
      next: (res) => {
        this.successMessage = 'Lesson updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadLessons();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update lesson.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  // ✅ Edit Slider
  // openEditSliderModal(slider: any) {
  //   this.currentEditSlider = slider;
  //   this.editSliderForm.patchValue({
  //     title: slider.title,
  //     redirectUrl: slider.link || '',
  //   });
  //   this.editSliderImagePreview = slider.path;
  //   this.editSliderImage = null;
  //   this.showEditSliderModal = true;
  // }

  onSliderImageChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type! Only PNG and JPG files are allowed.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.editSliderImage = file;
      this.editSliderImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitEditSlider() {
    if (this.editSliderForm.invalid || !this.currentEditSlider) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const formData = new FormData();
    formData.append('sliderId', this.currentEditSlider.id);
    formData.append('title', this.editSliderForm.value.title);
    formData.append('link', this.editSliderForm.value.redirectUrl || '');

    if (this.editSliderImage) {
      formData.append('file', this.editSliderImage);
    }

    this.http.put(`${this.apiUrl}/UpdateSlider`, formData).subscribe({
      next: (res) => {
        this.successMessage = 'Slider updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadSliders();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update slider.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  // ✅ Edit Suggestion
  openEditSuggestionModal(suggestion: any) {
    this.currentEditSuggestion = suggestion;
    this.editSuggestionForm.patchValue({
      title: suggestion.title,
    });
    this.showEditSuggestionModal = true;
  }

  submitEditSuggestion() {
    if (this.editSuggestionForm.invalid || !this.currentEditSuggestion) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const body = {
      id: this.currentEditSuggestion.id,
      title: this.editSuggestionForm.value.title,
    };

    this.http.post(`${this.apiUrl}/EditSuggestion`, body).subscribe({
      next: (res) => {
        this.successMessage = 'Suggestion updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadSuggestions();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update suggestion.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  // ✅ Delete handlers
  deleteCourse(courseId: string) {
    this.currentDeleteItem = courseId;
    this.deleteType = 'course';
    this.showDeleteConfirm = true;
  }

  deleteLesson(lessonId: string) {
    this.currentDeleteItem = lessonId;
    this.deleteType = 'lesson';
    this.showDeleteConfirm = true;
  }

  deleteSlider(sliderId: string) {
    this.currentDeleteItem = sliderId;
    this.deleteType = 'slider';
    this.showDeleteConfirm = true;
  }

  deleteSuggestion(suggestionId: string) {
    this.currentDeleteItem = suggestionId;
    this.deleteType = 'suggestion';
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (!this.currentDeleteItem || !this.deleteType) return;

    this.submitting = true;

    let endpoint = '';

    switch (this.deleteType) {
      case 'course':
        endpoint = `${this.apiUrl}/DeleteCourse?id=${this.currentDeleteItem}`;
        break;
      case 'lesson':
        endpoint = `${this.apiUrl}/DeleteLesson?id=${this.currentDeleteItem}`;
        break;
      case 'slider':
        endpoint = `${this.apiUrl}/DeleteSlider?id=${this.currentDeleteItem}`;
        break;
      case 'suggestion':
        endpoint = `${this.apiUrl}/DeleteSuggest?id=${this.currentDeleteItem}`;
        break;
    }

    this.http.get(endpoint).subscribe({
      next: (res: any) => {
        if (res.status === 200) {
          this.successMessage =
            this.deleteType != null
              ? `${
                  this.deleteType.charAt(0).toUpperCase() + this.deleteType.slice(1)
                } deleted successfully!`
              : '';
          this.submitting = false;
          this.closeModals();

          if (this.deleteType === 'course') {
            this.loadCourses();
          } else if (this.deleteType === 'lesson') {
            this.loadLessons();
          } else if (this.deleteType === 'slider') {
            this.loadSliders();
          } else if (this.deleteType === 'suggestion') {
            this.loadSuggestions();
          }
          this.deleteType = null;
        } else {
          this.submitting = false;
          this.closeModals();
          this.deleteType = null;
        }
      },
      error: (err) => {
        this.errorMessage = `Failed to delete ${this.deleteType}.`;
        this.submitting = false;
        console.error(err);
      },
    });
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.currentDeleteItem = null;
    this.deleteType = null;
  }

  // ✅ Close all modals
  closeModals() {
    this.showEditCourseModal = false;
    this.showEditLessonModal = false;
    this.showEditSliderModal = false;
    this.showEditSuggestionModal = false;
    this.showDeleteConfirm = false;

    this.currentEditCourse = null;
    this.currentEditLesson = null;
    this.currentEditSlider = null;
    this.currentEditSuggestion = null;
    this.currentDeleteItem = null;

    this.editCourseImage = null;
    this.editCourseImagePreview = null;
    this.editSliderImage = null;
    this.editSliderImagePreview = null;
  }
}
