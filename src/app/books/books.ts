import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { BookService } from '../services/books';

interface Book {
  id: number;
  title: string;
  description: string;
  coverImage: string;
  readUrl?: string;
  visitUrl?: string;
  downloadUrl?: string;
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './books.html',
  styleUrl: './books.css',
})
export class Books implements OnInit {
  isDropdownOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  searchQuery = '';
  loading = true;

  allBooks: Book[] = [];
  filteredBooks: Book[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private bookService: BookService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();

    // Load books from backend
    this.loadBooks();
  }

  loadBooks() {
    this.loading = true;

    this.bookService.getAllBooks().subscribe({
      next: (result: any[]) => {
        result.map((res) => {
          let book: Book = {
            id: res.id,
            title: res.title,
            description: res.description,
            coverImage: this.bookService.getCoverImage(res.id),
            visitUrl: this.bookService.getBookFile(res.id),
          };
          this.allBooks.push(book);
        });
      },
    });

    setTimeout(() => {
      this.filteredBooks = [...this.allBooks];
      this.loading = false;
    }, 1000);
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredBooks = [...this.allBooks];
      return;
    }

    this.filteredBooks = this.allBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        book.description.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
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
