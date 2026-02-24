import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../services/enviroment';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { TeamService } from '../services/team.service';
import { CategoryService } from '../services/category.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-edit-delete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './edit-delete.html',
  styleUrl: './edit-delete.css',
})
export class EditDelete implements OnInit {
  private apiUrl = `${environment.horizon}`;

  activeTab: 'category' | 'course' | 'lesson' | 'slider' | 'suggestion' | 'doctor' = 'category';
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  submitting = false;
  isSidebarOpen = false;
  errorMessage = '';
  successMessage = '';

  // Lists
  categories: any[] = [];
  courses: any[] = [];
  lessons: any[] = [];
  sliders: any[] = [];
  suggestions: any[] = [];
  doctors: any[] = [];

  // Filter
  selectedCourseId: string = '';

  // Loading states
  loadingCategories = false;
  loadingCourses = false;
  loadingLessons = false;
  loadingSliders = false;
  loadingSuggestions = false;
  loadingDoctors = false;

  // Forms
  editCategoryForm!: FormGroup;
  editCourseForm!: FormGroup;
  editLessonForm!: FormGroup;
  editSliderForm!: FormGroup;
  editSuggestionForm!: FormGroup;
  editDoctorForm!: FormGroup;

  // Modal states
  showEditCategoryModal = false;
  showEditCourseModal = false;
  showEditLessonModal = false;
  showEditSliderModal = false;
  showEditSuggestionModal = false;
  showEditDoctorModal = false;
  showDeleteConfirm = false;

  // Current item data
  currentEditCategory: any = null;
  currentEditCourse: any = null;
  currentEditLesson: any = null;
  currentEditSlider: any = null;
  currentEditSuggestion: any = null;
  currentEditDoctor: any = null;
  currentDeleteItem: any = null;
  deleteType: 'category' | 'course' | 'lesson' | 'slider' | 'suggestion' | 'doctor' | null = null;

  // File uploads
  editCategoryImage: File | null = null;
  editCategoryImagePreview: SafeUrl | null = null;
  editCourseImage: File | null = null;
  editCourseImagePreview: string | null = null;
  editSliderImage: File | null = null;
  editSliderImagePreview: string | null = null;
  editDoctorImage: File | null = null;
  editDoctorImagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private teamService: TeamService,
    private categoryService: CategoryService,
    private sanitizer: DomSanitizer
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
    this.editCategoryForm = this.fb.group({
      title: ['', Validators.required],
      about: [''],
    });

    this.editCourseForm = this.fb.group({
      title: ['', Validators.required],
      price: [0, Validators.required],
      instructorName: ['', Validators.required],
      categoryId: ['', Validators.required],
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

    this.editDoctorForm = this.fb.group({
      name: ['', Validators.required],
      specialty: ['', Validators.required],
      about: ['', Validators.required],
      expertise: ['', Validators.required],
      facebook: [''],
      whatsapp: [''],
      instagram: [''],
    });
  }

  switchTab(tab: 'category' | 'course' | 'lesson' | 'slider' | 'suggestion' | 'doctor') {
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
    this.loadCategories();
    this.loadCourses();
    // Don't load all lessons on init - wait for course selection
    this.loadSliders();
    this.loadSuggestions();
    this.loadDoctors();
  }

  loadCategories() {
    this.loadingCategories = true;
    this.categoryService.getAllCategories().subscribe({
      next: (res: any) => {
        this.categories = res || [];
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.loadingCategories = false;
      },
    });
  }

  openEditCategoryModal(category: any) {
    this.currentEditCategory = category;
    this.editCategoryForm.patchValue({
      title: category.title,
      about: category.about,
    });
    this.editCategoryImagePreview = category.imagePath; // Assuming imagePath is the url
    this.editCategoryImage = null;
    this.showEditCategoryModal = true;
  }

  onCategoryImageChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type! Only PNG and JPG files are allowed.');
      event.target.value = '';
      return;
    }

    this.editCategoryImage = file;
    this.editCategoryImagePreview = this.sanitizer.bypassSecurityTrustUrl(
      URL.createObjectURL(file),
    );
  }

  submitEditCategory() {
    if (this.editCategoryForm.invalid || !this.currentEditCategory) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const data: any = {
      id: this.currentEditCategory.id,
      title: this.editCategoryForm.value.title,
      description: this.editCategoryForm.value.about,
    };

    if (this.editCategoryImage) {
      data.image = this.editCategoryImage;
    }

    this.categoryService.editCategory(data).subscribe({
      next: (res) => {
        this.successMessage = 'Category updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadCategories();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update category.';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  deleteCategory(categoryId: number) {
    this.currentDeleteItem = categoryId;
    this.deleteType = 'category';
    this.showDeleteConfirm = true;
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

  loadDoctors() {
    this.loadingDoctors = true;
    this.teamService.getAllTeamMembers().subscribe({
      next: (res: any) => {
        this.doctors = (res || []).filter((member: any) => !member.isDeveloper);
        this.loadingDoctors = false;
      },
      error: (err) => {
        console.error('Failed to load doctors:', err);
        this.loadingDoctors = false;
      },
    });
  }

  // ✅ Edit Doctor
  openEditDoctorModal(doctor: any) {
    this.currentEditDoctor = doctor;
    this.editDoctorForm.patchValue({
      name: doctor.name,
      specialty: doctor.specialty,
      about: doctor.about,
      expertise: doctor.expertise.join(', '), // Convert array to comma-separated string
      facebook: doctor.contact?.facebook || '',
      whatsapp: doctor.contact?.whatsapp || '',
      instagram: doctor.contact?.instagram || '',
    });
    this.editDoctorImagePreview = doctor.imageUrl;
    this.editDoctorImage = null;
    this.showEditDoctorModal = true;
  }

  onDoctorImageChange(event: any) {
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
      this.editDoctorImage = file;
      this.editDoctorImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitEditDoctor() {
    if (this.editDoctorForm.invalid || !this.currentEditDoctor) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const formData = new FormData();
    formData.append('id', this.currentEditDoctor.id);
    formData.append('name', this.editDoctorForm.value.name);
    formData.append('specialty', this.editDoctorForm.value.specialty);
    formData.append('description', this.editDoctorForm.value.about);
    formData.append('expertise', this.editDoctorForm.value.expertise);
    formData.append('facebookUrl', this.editDoctorForm.value.facebook);
    formData.append('whatsappUrl', this.editDoctorForm.value.whatsapp);
    formData.append('instgramUrl', this.editDoctorForm.value.instagram);

    if (this.editDoctorImage) {
      formData.append('image', this.editDoctorImage);
    }

    this.teamService.updateInstructor(formData).subscribe({
      next: (res) => {
        this.successMessage = 'Doctor updated successfully!';
        this.submitting = false;
        this.closeModals();
        this.loadDoctors();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update doctor.';
        this.submitting = false;
        console.error(err);
      }
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
      categoryId: course.categoryId,
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
    formData.append('categoryId', this.editCourseForm.value.categoryId);

    if (this.editCourseImage) {
      formData.append('courseImage', this.editCourseImage);
    }

    this.http.post(`${this.apiUrl}/UpdateCourse`, formData).subscribe({
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

  deleteDoctor(doctorId: string) {
    this.currentDeleteItem = doctorId;
    this.deleteType = 'doctor';
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (!this.currentDeleteItem || !this.deleteType) return;

    this.submitting = true;

    let endpoint = '';

    switch (this.deleteType) {
      case 'category':
        // CategoryService handling via http request directly in this switch or separate service call? 
        // Existing code constructs endpoint string. Category matches pattern?
        // Let's use service or construct endpoint. Service `deleteCategory` uses `DeleteCategory?id=...`.
        // existing code uses `this.apiUrl`... let's stick to pattern if possible but cleaner to use service.
        // However, `confirmDelete` logic here is monolithic.
        // Let's use endpoint string for consistency with existing code style in this method.
        endpoint = `${this.apiUrl}/DeleteCategory?id=${this.currentDeleteItem}`;
        break;
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
      case 'doctor':
        endpoint = `${this.apiUrl}/DeleteInstructor?id=${this.currentDeleteItem}`;
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

          if (this.deleteType === 'category') {
            this.loadCategories();
          } else if (this.deleteType === 'course') {
            this.loadCourses();
          } else if (this.deleteType === 'lesson') {
            this.loadLessons();
          } else if (this.deleteType === 'slider') {
            this.loadSliders();
          } else if (this.deleteType === 'suggestion') {
            this.loadSuggestions();
          } else if (this.deleteType === 'doctor') {
            this.loadDoctors();
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
    this.showEditCategoryModal = false;
    this.showEditCourseModal = false;
    this.showEditLessonModal = false;
    this.showEditSliderModal = false;
    this.showEditSuggestionModal = false;
    this.showEditDoctorModal = false;
    this.showDeleteConfirm = false;

    this.currentEditCategory = null;
    this.currentEditCourse = null;
    this.currentEditLesson = null;
    this.currentEditSlider = null;
    this.currentEditSuggestion = null;
    this.currentEditDoctor = null;
    this.currentDeleteItem = null;

    this.editCategoryImage = null;
    this.editCategoryImagePreview = null;
    this.editCourseImage = null;
    this.editCourseImagePreview = null;
    this.editSliderImage = null;
    this.editSliderImagePreview = null;
    this.editDoctorImage = null;
    this.editDoctorImagePreview = null;
  }
}
