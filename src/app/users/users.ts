import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, DtoGetUser } from '../services/user.service';
import { Router } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class UsersComponent implements OnInit {
  users: DtoGetUser[] = [];
  filteredUsers: DtoGetUser[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  searchTerm: string = '';
  filterType: 'all' | 'admin' | 'user' = 'all';

  isSidebarOpen = false;
  isDropdownOpen = false;
  isAdmin = true;
  isLoggedIn = false;
  userName = 'Guest';

  constructor(private userService: UserService, private router: Router, private auth: AuthService) {
    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userName = user.firstName || 'Guest';
    this.isAdmin = user.isAdmin || false;
    this.isLoggedIn = !!localStorage.getItem('token');
  }

  ngOnInit(): void {
    this.loadUsers();

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
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Failed to load users. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(filter: 'all' | 'admin' | 'user'): void {
    this.filterType = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.users;

    // Apply role filter
    if (this.filterType === 'admin') {
      filtered = filtered.filter((u) => u.isAdmin);
    } else if (this.filterType === 'user') {
      filtered = filtered.filter((u) => !u.isAdmin);
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(this.searchTerm) ||
          u.lastName.toLowerCase().includes(this.searchTerm) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(this.searchTerm)
      );
    }

    this.filteredUsers = filtered;
  }

  getUserFullName(user: DtoGetUser): string {
    return `${user.firstName} ${user.lastName}`;
  }

  getUserInitials(user: DtoGetUser): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getAdminCount(): number {
    return this.users.filter((u) => u.isAdmin).length;
  }

  getNormalUserCount(): number {
    return this.users.filter((u) => !u.isAdmin).length;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  handleAuth(): void {
    if (this.isLoggedIn) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
