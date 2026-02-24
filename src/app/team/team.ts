import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { TeamService } from '../services/team.service';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { TeamMember } from '../models/team.model';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class TeamComponent implements OnInit {
  isDropdownOpen = false;
  isSidebarOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';

  teamMembers: TeamMember[] = [];
  selectedMember: TeamMember | null = null;
  isModalOpen = false;
  memberHasContact = false;

  activeTab: 'doctor' | 'developer' = 'doctor';

  constructor(
    private auth: AuthService,
    private router: Router,
    private teamService: TeamService
  ) { }

  ngOnInit() {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.userName = this.auth.getUserName();
    this.isAdmin = this.auth.isAdmin();

    this.loadTeamMembers();
  }

  loadTeamMembers() {
    this.teamService.getAllTeamMembers().subscribe({
      next: (members) => {
        this.teamMembers = members;
      },
      error: (err) => {
        console.error('Error fetching team members:', err);
      }
    });
  }

  get filteredMembers(): TeamMember[] {
    if (this.activeTab === 'developer') {
      return this.teamMembers.filter(m => m.isDeveloper);
    }
    return this.teamMembers.filter(m => !m.isDeveloper);
  }

  switchTeamTab(tab: 'doctor' | 'developer') {
    this.activeTab = tab;
  }

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
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/team' } });
    }
    this.isDropdownOpen = false;
  }

  openMemberDetail(member: TeamMember) {
    this.selectedMember = member;
    if (member.contact.instagram || member.contact.facebook || member.contact.whatsapp)
      this.memberHasContact = true;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedMember = null;
    document.body.style.overflow = 'auto';
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
