import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../services/enviroment';
import { SidebarComponent } from '../shared/sidebar/sidebar';

interface MeetingInfo {
  id?: number;
  meetingId?: string | number;
  topic?: string;
  startTime?: string | Date | null;
  hostName?: string;
  hostEmail?: string;
  hostId?: number;
  startUrl?: string;
  joinUrl?: string;
  passCode?: string;
  numericPassword?: string;
  isFinished?: boolean;
  status?: string;
  adminJoined?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class SessionsComponent implements OnInit, OnDestroy {
  private apiUrl = `${environment.horizon}`;
  private refreshInterval: any = null;
  private readonly REFRESH_INTERVAL_MS = 5000;

  isLoggedIn = false;
  isAdmin = false;
  userName = 'Guest';
  isDropdownOpen = false;
  isSidebarOpen = false;
  submitting = false;
  loadingMeetings = false;

  errorMessage = '';
  successMessage = '';

  meetings: MeetingInfo[] = [];
  meetingForm!: FormGroup;
  showAddMeetingModal = false;
  showDeleteConfirmModal = false;
  meetingToDelete: MeetingInfo | null = null;
  deleting = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
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

    this.initializeForm();
    this.loadMeetings();

    if (!this.isAdmin) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  initializeForm() {
    this.meetingForm = this.fb.group({
      topic: ['', Validators.required],
      startTime: ['', Validators.required],
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

  loadMeetings() {
    this.loadingMeetings = true;
    this.http.get(`${this.apiUrl}/GetAllMeetingsInfo`).subscribe({
      next: (res: any) => {
        const payload = Array.isArray(res?.data) ? res.data : res;
        this.meetings = (payload || []).map((meeting: any) => {
          const enriched = this.enrichMeeting(meeting);
          this.updateMeetingFinishedStatus(enriched);
          return enriched;
        });
        this.loadingMeetings = false;

        if (!this.isAdmin) {
          this.startAutoRefresh();
        }
      },
      error: (err) => {
        console.error('Failed to load meetings:', err);
        this.errorMessage = 'Failed to load sessions';
        this.loadingMeetings = false;
      },
    });
  }

  private updateMeetingFinishedStatus(meeting: MeetingInfo): void {
    if (meeting?.isFinished === true) {
      meeting.status = 'finished';
    }
  }

  openAddMeetingModal() {
    this.showAddMeetingModal = true;
    this.meetingForm.reset();
  }

  closeModal() {
    this.showAddMeetingModal = false;
    this.meetingForm.reset();
  }

  submitMeeting() {
    if (this.meetingForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.submitting = true;

    const formValue = this.meetingForm.value;
    const startTime = new Date(formValue.startTime);
    const payload = {
      topic: formValue.topic,
      startTime: startTime.toISOString(),
    };

    this.http.post(`${this.apiUrl}/AddNewMeeting`, payload).subscribe({
      next: (res: any) => {
        if (res?.status === 200) {
          const meetingData = this.enrichMeeting(res?.data || {});

          this.successMessage = 'Meeting created successfully!';
          this.submitting = false;
          this.closeModal();
          this.loadMeetings();

          if (this.isAdmin && this.hasMeetingStarted(meetingData)) {
            this.navigateToMeeting(meetingData);
          } else if (this.isAdmin) {
            this.successMessage = `Meeting created successfully!`;
          }

          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
          return;
        }

        this.showErrorMessage(res?.message || 'Failed to create meeting.');
      },
      error: (err) => {
        console.error(err);
        this.showErrorMessage('Failed to create meeting.');
      },
    });
  }

  // DELETE MEETING FUNCTIONALITY
  openDeleteConfirmModal(meeting: MeetingInfo) {
    this.meetingToDelete = meeting;
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.meetingToDelete = null;
  }

  confirmDeleteMeeting() {
    if (!this.meetingToDelete?.id) {
      this.showErrorMessage('Invalid meeting ID');
      this.closeDeleteConfirmModal();
      return;
    }

    this.deleting = true;

    this.http.get(`${this.apiUrl}/DeleteMeeting?id=${this.meetingToDelete.id}`).subscribe({
      next: (res: any) => {
        this.deleting = false;
        this.successMessage = 'Meeting deleted successfully!';
        this.closeDeleteConfirmModal();
        this.loadMeetings();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Failed to delete meeting:', err);
        this.deleting = false;
        this.showErrorMessage('Failed to delete meeting. Please try again.');
        this.closeDeleteConfirmModal();
      },
    });
  }

  joinMeeting(meeting: any) {
    const normalizedMeeting = this.enrichMeeting(meeting);

    if (!normalizedMeeting?.meetingId && !normalizedMeeting?.joinUrl) {
      this.showErrorMessage('Meeting information is incomplete. Please try again later.');
      return;
    }

    if (!this.hasMeetingStarted(normalizedMeeting)) {
      const timeUntilStart = this.getTimeUntilStart(normalizedMeeting);
      this.showErrorMessage(`Meeting has not started yet. It will start in ${timeUntilStart}.`);
      return;
    }

    if (this.isMeetingFinished(normalizedMeeting)) {
      this.showErrorMessage('This meeting has ended. The host has left the meeting.');
      return;
    }

    if (!this.isAdmin && !this.isHostJoined(normalizedMeeting)) {
      this.showErrorMessage(
        'Waiting for host to join the meeting. The page will refresh automatically...',
      );
      this.loadMeetings();
      this.startAutoRefresh();
      return;
    }

    this.navigateToMeeting(normalizedMeeting);
  }

  private enrichMeeting(meeting: any): MeetingInfo {
    if (!meeting) {
      return meeting;
    }

    const passCode = meeting?.passCode || this.extractPasscode(meeting?.joinUrl);

    return {
      ...meeting,
      passCode,
      numericPassword: meeting?.numericPassword || meeting?.numericPasscode || '',
    } as MeetingInfo;
  }

  private extractPasscode(joinUrl?: string): string | undefined {
    if (!joinUrl) {
      return undefined;
    }

    try {
      const url = new URL(joinUrl);
      return url.searchParams.get('pwd') || undefined;
    } catch (error) {
      console.warn('Failed to extract passcode from join URL', error);
      return undefined;
    }
  }

  private showErrorMessage(message: string) {
    this.errorMessage = message;
    this.submitting = false;

    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  private navigateToMeeting(meeting: MeetingInfo) {
    if (!meeting) {
      return;
    }

    localStorage.setItem('currentMeeting', JSON.stringify(meeting));

    const routeId = meeting?.meetingId || meeting?.id;
    if (!routeId) {
      this.showErrorMessage('Unable to open meeting. Missing meeting identifier.');
      return;
    }

    this.router.navigate(['/zoom-meeting', routeId]);
  }

  private hasMeetingStarted(meeting: MeetingInfo): boolean {
    if (!meeting?.startTime) {
      return false;
    }

    const startTime = new Date(meeting.startTime);
    const now = new Date();

    return now.getTime() >= startTime.getTime() - 60000;
  }

  private getTimeUntilStart(meeting: MeetingInfo): string {
    if (!meeting?.startTime) {
      return 'unknown time';
    }
    const startTime = new Date(meeting.startTime);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'now';
    }

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

  private isMeetingFinished(meeting: MeetingInfo): boolean {
    if (meeting?.isFinished === true) {
      return true;
    }

    if (meeting?.status === 'finished' || meeting?.status === 'ended') {
      return true;
    }

    return false;
  }

  getMeetingStatus(meeting: MeetingInfo): 'scheduled' | 'live' | 'waiting' | 'finished' {
    if (this.isMeetingFinished(meeting)) {
      return 'finished';
    }
    if (this.hasMeetingStarted(meeting)) {
      if (!this.isAdmin && !this.isHostJoined(meeting)) {
        return 'waiting';
      }
      return 'live';
    }
    return 'scheduled';
  }

  canJoinMeeting(meeting: MeetingInfo): boolean {
    if (!this.hasMeetingStarted(meeting)) {
      return false;
    }

    if (this.isMeetingFinished(meeting)) {
      return false;
    }

    if (!this.isAdmin && !this.isHostJoined(meeting)) {
      return false;
    }

    return true;
  }

  private isHostJoined(meeting: MeetingInfo): boolean {
    return meeting?.adminJoined === true;
  }

  getMeetingStatusMessage(meeting: MeetingInfo): string {
    const status = this.getMeetingStatus(meeting);
    if (status === 'finished') {
      return 'Meeting Ended';
    }
    if (status === 'scheduled') {
      return `Starts in ${this.getTimeUntilStart(meeting)}`;
    }
    if (status === 'live') {
      if (!this.isAdmin && !this.isHostJoined(meeting)) {
        return 'Waiting for Host';
      }
      return 'Live';
    }
    return 'Live';
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();

    const hasWaitingMeetings = this.meetings.some(
      (meeting) =>
        this.hasMeetingStarted(meeting) &&
        !this.isHostJoined(meeting) &&
        !this.isMeetingFinished(meeting),
    );

    if (hasWaitingMeetings) {
      this.refreshInterval = setInterval(() => {
        this.loadMeetings();
      }, this.REFRESH_INTERVAL_MS);
    }
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
