import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { BookService, DtoGetBook } from '../services/books';
import { CategoryService } from '../services/category.service';
import { SidebarComponent } from '../shared/sidebar/sidebar';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './books.html',
  styleUrl: './books.css',
})
export class Books implements OnInit {
  isDropdownOpen = false;
  isSidebarOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';

  // Two-step navigation (mirrors Material page)
  viewMode: 'categories' | 'books' = 'categories';
  categories: any[] = [];
  selectedCategory: any = null;
  loadingCategories = false;
  loadingBooks = false;

  allBooks: DtoGetBook[] = [];
  filteredBooks: DtoGetBook[] = [];
  searchQuery = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private bookService: BookService,
    private categoryService: CategoryService,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();
    this.loadCategories();
  }

  // ----------------------------
  // Load all categories
  // ----------------------------
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

  // ----------------------------
  // User selects a category → load books
  // ----------------------------
  selectCategory(category: any) {
    this.selectedCategory = category;
    this.viewMode = 'books';
    this.loadingBooks = true;
    this.allBooks = [];
    this.filteredBooks = [];
    this.searchQuery = '';

    this.bookService.getBooksByCategory(category.id).subscribe({
      next: (res: DtoGetBook[]) => {
        this.allBooks = res || [];
        this.filteredBooks = [...this.allBooks];
        this.loadingBooks = false;
      },
      error: (err) => {
        console.error('Failed to load books:', err);
        this.loadingBooks = false;
      },
    });
  }

  // ----------------------------
  // Back to categories
  // ----------------------------
  goBackToCategories() {
    this.viewMode = 'categories';
    this.selectedCategory = null;
    this.allBooks = [];
    this.filteredBooks = [];
    this.searchQuery = '';
  }

  // ----------------------------
  // Search books within category
  // ----------------------------
  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredBooks = [...this.allBooks];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredBooks = this.allBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)),
    );
  }

  // ----------------------------
  // Open book PDF in new tab
  // ----------------------------
  visitBook(book: DtoGetBook) {
    if (book.fileLink) {
      window.open(book.fileLink, '_blank');
    }
  }

  // ----------------------------
  // Shared UI helpers
  // ----------------------------
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  handleAuth() {
    if (this.isLoggedIn) {
      this.auth.logout();
      this.isLoggedIn = false;
      this.userName = 'Guest';
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/books' } });
    }
    this.isDropdownOpen = false;
  }

  goBackToHome() {
    this.router.navigate(['/home']);
  }
}
