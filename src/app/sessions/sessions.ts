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
  private readonly REFRESH_INTERVAL_MS = 5000; // Refresh every 5 seconds

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
    this.userName = userData?.firstName + ' ' + userData?.lastName || 'User';

    this.initializeForm();
    this.loadMeetings();

    // Start auto-refresh for meeting status (only if not admin, as admin doesn't need to wait)
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
          // Update meeting finished status from localStorage
          this.updateMeetingFinishedStatus(enriched);
          return enriched;
        });
        this.loadingMeetings = false;

        // Restart auto-refresh if needed (checks if any meetings are waiting for host)
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

  /**
   * Update meeting finished status from backend API
   * The backend API now provides isFinished property directly
   */
  private updateMeetingFinishedStatus(meeting: MeetingInfo): void {
    // Meeting finished status is now provided by the backend API
    // via the isFinished property in GetAllMeetingsInfo response
    // No need to check localStorage anymore
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

          // Only auto-join if admin and meeting start time has been reached
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

  joinMeeting(meeting: any) {
    const normalizedMeeting = this.enrichMeeting(meeting);

    if (!normalizedMeeting?.meetingId && !normalizedMeeting?.joinUrl) {
      this.showErrorMessage('Meeting information is incomplete. Please try again later.');
      return;
    }

    // Check if meeting has started
    if (!this.hasMeetingStarted(normalizedMeeting)) {
      const timeUntilStart = this.getTimeUntilStart(normalizedMeeting);
      this.showErrorMessage(`Meeting has not started yet. It will start in ${timeUntilStart}.`);
      return;
    }

    // Check if meeting is finished (host has left)
    if (this.isMeetingFinished(normalizedMeeting)) {
      this.showErrorMessage('This meeting has ended. The host has left the meeting.');
      return;
    }

    // If user is not admin/host, check if host has joined
    if (!this.isAdmin && !this.isHostJoined(normalizedMeeting)) {
      this.showErrorMessage(
        'Waiting for host to join the meeting. The page will refresh automatically...'
      );
      // Refresh meetings to get updated status
      this.loadMeetings();
      // Start auto-refresh if not already started
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

  /**
   * Check if meeting has started (current time >= start time)
   */
  private hasMeetingStarted(meeting: MeetingInfo): boolean {
    if (!meeting?.startTime) {
      return false;
    }

    const startTime = new Date(meeting.startTime);
    const now = new Date();

    // Allow 1 minute buffer for timezone/server time differences
    return now.getTime() >= startTime.getTime() - 60000;
  }

  /**
   * Get time until meeting starts in human-readable format
   */
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

  /**
   * Check if meeting is finished (host has left)
   * Uses backend isFinished property from GetAllMeetingsInfo API
   * Only the host leaving triggers the backend to set isFinished = true
   */
  private isMeetingFinished(meeting: MeetingInfo): boolean {
    // Check if meeting has explicit finished status from backend
    if (meeting?.isFinished === true) {
      return true;
    }

    // Also check status field for backward compatibility
    if (meeting?.status === 'finished' || meeting?.status === 'ended') {
      return true;
    }

    return false;
  }

  /**
   * Get meeting status for display
   */
  getMeetingStatus(meeting: MeetingInfo): 'scheduled' | 'live' | 'waiting' | 'finished' {
    if (this.isMeetingFinished(meeting)) {
      return 'finished';
    }
    if (this.hasMeetingStarted(meeting)) {
      // If meeting has started but host hasn't joined (and user is not admin)
      if (!this.isAdmin && !this.isHostJoined(meeting)) {
        return 'waiting';
      }
      return 'live';
    }
    return 'scheduled';
  }

  /**
   * Check if user can join meeting
   */
  canJoinMeeting(meeting: MeetingInfo): boolean {
    // Must check all conditions
    if (!this.hasMeetingStarted(meeting)) {
      return false; // Meeting hasn't started yet
    }

    if (this.isMeetingFinished(meeting)) {
      return false; // Meeting is finished
    }

    // If user is not admin/host, host must have joined first
    if (!this.isAdmin && !this.isHostJoined(meeting)) {
      return false; // Waiting for host to join
    }

    return true;
  }

  /**
   * Check if host has joined the meeting
   */
  private isHostJoined(meeting: MeetingInfo): boolean {
    return meeting?.adminJoined === true;
  }

  /**
   * Get meeting status message
   */
  getMeetingStatusMessage(meeting: MeetingInfo): string {
    const status = this.getMeetingStatus(meeting);
    if (status === 'finished') {
      return 'Meeting Ended';
    }
    if (status === 'scheduled') {
      return `Starts in ${this.getTimeUntilStart(meeting)}`;
    }
    if (status === 'live') {
      // If meeting has started but host hasn't joined (and user is not admin)
      if (!this.isAdmin && !this.isHostJoined(meeting)) {
        return 'Waiting for Host';
      }
      return 'Live';
    }
    return 'Live';
  }

  /**
   * Start auto-refresh for meeting status
   */
  private startAutoRefresh() {
    // Clear existing interval if any
    this.stopAutoRefresh();

    // Only refresh if there are meetings that are waiting for host
    const hasWaitingMeetings = this.meetings.some(
      (meeting) =>
        this.hasMeetingStarted(meeting) &&
        !this.isHostJoined(meeting) &&
        !this.isMeetingFinished(meeting)
    );

    if (hasWaitingMeetings) {
      this.refreshInterval = setInterval(() => {
        this.loadMeetings();
      }, this.REFRESH_INTERVAL_MS);
    }
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
