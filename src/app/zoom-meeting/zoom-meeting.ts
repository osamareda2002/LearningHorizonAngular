import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../services/enviroment';
import { AuthService } from '../services/auth';
import { ZoomMtg } from '@zoom/meetingsdk';

// Preload Zoom SDK
ZoomMtg.preLoadWasm();
ZoomMtg.prepareWebSDK();

@Component({
  selector: 'app-zoom-meeting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zoom-meeting.html',
  styleUrl: './zoom-meeting.css',
})
export class ZoomMeetingComponent implements OnInit, OnDestroy {
  private apiUrl = `${environment.horizon}`;
  private leaveUrl = window.location.origin + '/sessions';
  private isZoomInitialized = false;
  private isMeetingJoined = false;
  private beforeUnloadListener: any = null;
  private hostJoinedApiCalled = false;
  private meetingFinishedApiCalled = false;

  meetingId: string = '';
  isLoading = true;
  errorMessage = '';
  meetingInfo: any;
  isHost = false;
  userName = '';
  userEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Get user data
    const userData: any = this.auth.getUserData();
    this.userName = `${userData?.firstName} ${userData?.lastName}` || 'Guest';
    this.userEmail = userData?.email || '';
    this.isHost = userData?.isAdmin === 'True';

    // Get meeting ID from route
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';

    // Get meeting info from localStorage or API
    const storedMeeting = localStorage.getItem('currentMeeting');
    if (storedMeeting) {
      this.meetingInfo = this.enrichMeeting(JSON.parse(storedMeeting));
      this.initializeZoomSDK();
    } else {
      this.loadMeetingInfo();
    }
  }

  async loadMeetingInfo() {
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/GetAllMeetingsInfo`)
      );

      const payload = Array.isArray(response?.data) ? response.data : response;
      const meeting = (payload || []).find((item: any) => {
        const databaseId = item?.id?.toString();
        const zoomId = item?.meetingId?.toString();
        return databaseId === this.meetingId || zoomId === this.meetingId;
      });

      if (!meeting) {
        throw new Error('Meeting not found. Please try again later.');
      }

      this.meetingInfo = this.enrichMeeting(meeting);
      await this.initializeZoomSDK();
    } catch (error: any) {
      console.error('Failed to load meeting info:', error);
      this.errorMessage = error?.message || 'Failed to load meeting information';
      this.isLoading = false;
    }
  }

  async initializeZoomSDK() {
    try {
      console.log('=== Initializing Zoom SDK ===');
      console.log('Meeting Info:', this.meetingInfo);

      if (!this.meetingInfo?.meetingId) {
        throw new Error('Meeting link is not available yet. Please contact the administrator.');
      }

      // Check if meeting has started
      if (!this.hasMeetingStarted(this.meetingInfo)) {
        throw new Error('Meeting has not started yet. Please wait for the scheduled start time.');
      }

      // Check if meeting is finished
      if (this.isMeetingFinished(this.meetingInfo)) {
        throw new Error('This meeting has ended. The host has left the meeting.');
      }

      // If user is not host, check if host has joined
      if (!this.isHost && !this.isHostJoined(this.meetingInfo)) {
        throw new Error('Waiting for host to join the meeting. Please try again in a moment.');
      }

      const meetingNumber = this.getMeetingNumber();
      console.log('Meeting Number:', meetingNumber);

      if (!meetingNumber) {
        throw new Error('Meeting number is invalid.');
      }

      // Get signature from backend
      const signature = await this.getSignature(meetingNumber);
      console.log('Signature received (first 50 chars):', signature?.substring(0, 50));

      if (!signature) {
        throw new Error('Failed to get meeting signature');
      }

      // Extract password
      const password = String(
        this.meetingInfo?.passCode ||
          this.meetingInfo?.password ||
          this.meetingInfo?.numericPassword ||
          this.extractPasscode(this.meetingInfo?.joinUrl) ||
          ''
      );

      console.log('Password:', password ? '***' + password.slice(-3) : 'EMPTY');
      console.log('User Name:', this.userName);
      console.log('User Email:', this.userEmail);
      console.log('Role:', this.isHost ? 'Host (1)' : 'Participant (0)');

      // Show Zoom container
      const zoomRoot = document.getElementById('zmmtg-root');
      if (zoomRoot) {
        zoomRoot.style.display = 'block';
        zoomRoot.style.visibility = 'visible';
        zoomRoot.style.opacity = '1';
        zoomRoot.style.position = 'fixed';
        zoomRoot.style.top = '0';
        zoomRoot.style.left = '0';
        zoomRoot.style.width = '100%';
        zoomRoot.style.height = '100%';
        zoomRoot.style.zIndex = '9999';
        zoomRoot.setAttribute('data-meeting-active', 'true');
        zoomRoot.removeAttribute('aria-hidden');
      }

      // Initialize and join meeting outside Angular zone for better performance
      this.ngZone.runOutsideAngular(() => {
        ZoomMtg.init({
          leaveUrl: this.leaveUrl,
          patchJsMedia: true,
          leaveOnPageUnload: true,
          success: (success: any) => {
            console.log('✅ Zoom SDK initialized successfully', success);
            this.isZoomInitialized = true;

            // Set up event listeners for meeting events
            this.setupMeetingEventListeners();

            ZoomMtg.join({
              signature: signature,
              sdkKey: environment.zoomSdkKey,
              meetingNumber: meetingNumber,
              passWord: password,
              userName: this.userName,
              userEmail: this.userEmail,
              tk: '', // registrant token (leave empty for non-webinar)
              zak: '', // zoom access token (leave empty)
              success: (joinSuccess: any) => {
                console.log('✅ Successfully joined Zoom meeting', joinSuccess);
                this.ngZone.run(() => {
                  this.isLoading = false;
                  this.isMeetingJoined = true;

                  // If host joined, call HostJoined API
                  if (this.isHost && !this.hostJoinedApiCalled) {
                    this.notifyHostJoined();
                  }
                });
              },
              error: (joinError: any) => {
                console.error('❌ Failed to join meeting', joinError);
                this.ngZone.run(() => {
                  this.errorMessage = 'Failed to join the meeting. Please try again.';
                  this.isLoading = false;
                });
              },
            });
          },
          error: (initError: any) => {
            console.error('❌ Zoom SDK initialization failed', initError);
            this.ngZone.run(() => {
              this.errorMessage = 'Failed to initialize Zoom SDK. Please try again.';
              this.isLoading = false;
            });
          },
        });
      });
    } catch (error: any) {
      console.error('❌ Zoom SDK initialization error:', error);
      this.errorMessage = error.message || 'Failed to initialize Zoom meeting';
      this.isLoading = false;
    }
  }

  async getSignature(meetingNumber: string): Promise<string> {
    try {
      console.log('=== Requesting Signature ===');
      console.log('Meeting Number:', meetingNumber);
      console.log('Role:', this.isHost ? 1 : 0);

      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/GenerateZoomSignature`, {
          meetingNumber: meetingNumber,
          role: this.isHost ? 1 : 0,
        })
      );

      console.log('Signature Response:', response);

      if (!response?.signature) {
        throw new Error(response?.message || 'Unable to generate meeting signature');
      }

      return response.signature;
    } catch (error) {
      console.error('❌ Failed to get signature:', error);
      throw error;
    }
  }

  leaveMeeting() {
    // Clean up immediately before navigation
    this.cleanupZoomSDK();

    // Use a small timeout to ensure cleanup completes before navigation
    setTimeout(() => {
      this.router.navigate(['/sessions']).then(() => {
        // Force hide container after navigation as well
        setTimeout(() => {
          this.hideZoomContainer();
        }, 50);
      });
    }, 50);
  }

  goBack() {
    // Clean up immediately before navigation
    this.cleanupZoomSDK();

    // Use a small timeout to ensure cleanup completes before navigation
    setTimeout(() => {
      this.router.navigate(['/sessions']).then(() => {
        // Force hide container after navigation as well
        setTimeout(() => {
          this.hideZoomContainer();
        }, 50);
      });
    }, 50);
  }

  ngOnDestroy() {
    this.cleanupZoomSDK();
  }

  /**
   * Clean up Zoom SDK and meeting resources
   */
  private cleanupZoomSDK() {
    // Hide container immediately first to prevent UI issues
    this.hideZoomContainer();

    try {
      // ONLY if HOST is leaving, notify backend that meeting is finished
      // Regular participants can leave without affecting meeting status
      if (
        this.isHost &&
        this.isMeetingJoined &&
        this.meetingInfo &&
        !this.meetingFinishedApiCalled
      ) {
        console.log('🏠 Host is leaving - notifying backend that meeting is finished');
        this.notifyMeetingFinished();
      } else if (!this.isHost) {
        console.log('👤 Regular participant is leaving - meeting continues');
      }

      // Leave the meeting if it was joined
      if (this.isMeetingJoined && this.isZoomInitialized) {
        try {
          // Try to leave the meeting properly using Zoom SDK
          if (typeof (ZoomMtg as any).leaveMeeting === 'function') {
            (ZoomMtg as any).leaveMeeting({
              success: (leaveSuccess: any) => {
                console.log('✅ Successfully left Zoom meeting', leaveSuccess);
                this.hideZoomContainer();
              },
              error: (leaveError: any) => {
                console.warn('⚠️ Error leaving meeting (non-critical):', leaveError);
                // Force hide even if leave fails
                this.hideZoomContainer();
              },
            });
          } else if (typeof (ZoomMtg as any).leave === 'function') {
            // Alternative method name
            (ZoomMtg as any).leave({
              success: (leaveSuccess: any) => {
                console.log('✅ Successfully left Zoom meeting', leaveSuccess);
                this.hideZoomContainer();
              },
              error: (leaveError: any) => {
                console.warn('⚠️ Error leaving meeting (non-critical):', leaveError);
                this.hideZoomContainer();
              },
            });
          }
        } catch (error) {
          console.warn('⚠️ Could not leave meeting (non-critical):', error);
          // Ensure container is hidden even if leave fails
          this.hideZoomContainer();
        }
      }

      // Remove event listeners
      this.removeEventListeners();

      // Note: We no longer use localStorage for tracking meeting finished status
      // The backend API handles this via the MeetingFinished endpoint
      // Only the host leaving triggers the API call (already handled above)

      // Clear localStorage
      localStorage.removeItem('currentMeeting');

      // Reset flags
      this.isZoomInitialized = false;
      this.isMeetingJoined = false;

      // Force hide container one more time after a short delay to catch any delayed renders
      setTimeout(() => {
        this.hideZoomContainer();
      }, 100);
    } catch (error) {
      console.error('Error during Zoom SDK cleanup:', error);
      // Ensure container is hidden even if cleanup fails
      this.hideZoomContainer();
    }
  }

  /**
   * Hide and clean up the Zoom SDK container
   */
  private hideZoomContainer() {
    try {
      // Hide the zmmtg-root element (Zoom SDK's main container)
      const zoomRoot = document.getElementById('zmmtg-root');
      if (zoomRoot) {
        // Remove the active attribute to trigger CSS hiding
        zoomRoot.removeAttribute('data-meeting-active');
        zoomRoot.style.display = 'none';
        zoomRoot.style.visibility = 'hidden';
        zoomRoot.style.opacity = '0';
        zoomRoot.style.position = 'fixed';
        zoomRoot.style.top = '-9999px';
        zoomRoot.style.left = '-9999px';
        zoomRoot.style.zIndex = '-1';
        zoomRoot.setAttribute('aria-hidden', 'true');
        // Remove all child elements to ensure cleanup
        try {
          while (zoomRoot.firstChild) {
            zoomRoot.removeChild(zoomRoot.firstChild);
          }
        } catch (e) {
          // Some elements might be protected, continue anyway
          console.warn('Could not remove all child elements:', e);
        }
      }

      // Also check for other potential Zoom containers by various selectors
      // Use specific selectors to avoid hiding non-Zoom elements
      const zoomSpecificSelectors = [
        '[id^="zmmtg"]',
        '[id*="zoom-meeting"]',
        '[class*="zmmtg"]',
        '[class*="zoom-meeting"]',
        '.zm-modal',
        '.zm-overlay',
        '[class*="zoom-overlay"]',
        '[class*="zoom-container"]',
        '[data-zoom]',
      ];

      zoomSpecificSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element: any) => {
            if (element && element !== zoomRoot && element.id !== 'zmmtg-root') {
              // Only hide if it's not the root element we already handled
              if (element.style) {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
              }
            }
          });
        } catch (e) {
          // Continue if selector fails
        }
      });

      // Remove any Zoom-related overlays or modals from body
      const zoomOverlays = document.querySelectorAll(
        '.zm-modal, .zm-overlay, [class*="zoom-overlay"]'
      );
      zoomOverlays.forEach((overlay: any) => {
        try {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        } catch (e) {
          // Element might already be removed or protected
        }
      });

      // Force remove any fullscreen zoom elements
      const fullscreenElements = document.querySelectorAll(
        '[class*="fullscreen"], [id*="fullscreen"]'
      );
      fullscreenElements.forEach((element: any) => {
        if (element && element.style && element.getAttribute('data-zoom')) {
          element.style.display = 'none';
        }
      });

      // Also hide any iframes that Zoom might have created
      const zoomIframes = document.querySelectorAll('iframe[src*="zoom"], iframe[id*="zoom"]');
      zoomIframes.forEach((iframe: any) => {
        if (iframe && iframe.style) {
          iframe.style.display = 'none';
          iframe.src = 'about:blank'; // Clear iframe source
        }
      });
    } catch (error) {
      console.warn('Error hiding Zoom container:', error);
    }
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners() {
    try {
      if (this.beforeUnloadListener) {
        window.removeEventListener('beforeunload', this.beforeUnloadListener);
        this.beforeUnloadListener = null;
      }
    } catch (error) {
      console.warn('Error removing event listeners:', error);
    }
  }

  private enrichMeeting(meeting: any) {
    if (!meeting) {
      return meeting;
    }

    return {
      ...meeting,
      passCode: meeting?.passCode || this.extractPasscode(meeting?.joinUrl),
      numericPassword: meeting?.numericPassword || meeting?.numericPasscode || '',
    };
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

  getMeetingNumber(): string {
    const rawMeetingId =
      this.meetingInfo?.meetingId ?? this.meetingInfo?.meeting_id ?? this.meetingInfo?.id;

    console.log('Raw Meeting ID:', rawMeetingId);

    if (!rawMeetingId) {
      console.error('No meeting ID found');
      return '';
    }

    const sanitized = String(rawMeetingId).trim().replace(/\D/g, '');
    console.log('Sanitized Meeting Number:', sanitized);

    return sanitized;
  }

  /**
   * Check if meeting has started (current time >= start time)
   */
  private hasMeetingStarted(meeting: any): boolean {
    if (!meeting?.startTime) {
      return true; // If no start time, allow joining (legacy meetings)
    }

    const startTime = new Date(meeting.startTime);
    const now = new Date();

    // Allow 1 minute buffer for timezone/server time differences
    return now.getTime() >= startTime.getTime() - 60000;
  }

  /**
   * Check if meeting is finished (host has left)
   * Uses backend isFinished property from GetAllMeetingsInfo API
   * Only the host leaving triggers the backend to set isFinished = true
   */
  private isMeetingFinished(meeting: any): boolean {
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
   * Check if host has joined the meeting
   */
  private isHostJoined(meeting: any): boolean {
    return meeting?.adminJoined === true;
  }

  /**
   * Mark meeting as finished when host leaves
   * Note: This is now handled by the backend API via MeetingFinished endpoint
   * This method is kept for backward compatibility but no longer sets localStorage
   */
  private markMeetingAsFinished(): void {
    // Meeting finished status is now managed by the backend API
    // The MeetingFinished API endpoint is called when host leaves
    // No need to track in localStorage anymore
    console.log('✅ Meeting finished status will be updated via backend API');
  }

  /**
   * Set up event listeners for Zoom meeting events
   */
  private setupMeetingEventListeners(): void {
    try {
      // Store the listener reference so we can remove it later
      this.beforeUnloadListener = () => {
        // Notify backend if host is leaving
        if (
          this.isHost &&
          this.isMeetingJoined &&
          this.meetingInfo &&
          !this.meetingFinishedApiCalled
        ) {
          // Use sendBeacon for reliable API call on page unload
          this.notifyMeetingFinishedSync();
        }
        this.cleanupZoomSDK();
      };

      window.addEventListener('beforeunload', this.beforeUnloadListener);
    } catch (error) {
      console.warn('Failed to set up meeting event listeners:', error);
    }
  }

  /**
   * Notify backend that host has joined the meeting
   */
  private async notifyHostJoined() {
    if (this.hostJoinedApiCalled || !this.isHost || !this.meetingInfo) {
      return;
    }

    try {
      const meetingNumber = this.getMeetingNumber();
      if (!meetingNumber) {
        console.warn('⚠️ Cannot notify host joined: missing meeting number');
        return;
      }

      this.hostJoinedApiCalled = true;

      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/HostJoined?meetingNumber=${meetingNumber}`)
      );

      console.log('✅ Host joined notification sent successfully', response);
    } catch (error: any) {
      console.error('❌ Failed to notify host joined:', error);
      // Reset flag so we can retry if needed
      this.hostJoinedApiCalled = false;
    }
  }

  /**
   * Notify backend that meeting is finished (host left)
   * Only called when HOST leaves the meeting
   */
  private async notifyMeetingFinished() {
    // Only proceed if host is leaving and hasn't called API yet
    if (this.meetingFinishedApiCalled || !this.isHost || !this.meetingInfo) {
      return;
    }

    try {
      const meetingNumber = this.getMeetingNumber();
      if (!meetingNumber) {
        console.warn('⚠️ Cannot notify meeting finished: missing meeting number');
        return;
      }

      this.meetingFinishedApiCalled = true;

      // Use GET request with query parameter as per API specification
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/MeetingFinished`, {
          params: {
            meetingNumber: meetingNumber,
          },
        })
      );

      console.log('✅ Meeting finished notification sent successfully', response);
    } catch (error: any) {
      console.error('❌ Failed to notify meeting finished:', error);
      // Don't reset flag here since meeting is already finished
    }
  }

  /**
   * Synchronous version for beforeunload event
   * Only called when HOST is leaving
   * Uses fetch with keepalive for GET requests (sendBeacon doesn't work well with GET)
   */
  private notifyMeetingFinishedSync() {
    if (this.meetingFinishedApiCalled || !this.isHost || !this.meetingInfo) {
      return;
    }

    try {
      const meetingNumber = this.getMeetingNumber();
      if (!meetingNumber) {
        return;
      }

      // For GET requests, use fetch with keepalive flag for reliable delivery during page unload
      const url = `${this.apiUrl}/MeetingFinished?meetingNumber=${encodeURIComponent(
        meetingNumber
      )}`;

      // Use fetch with keepalive for GET request (works better than sendBeacon for GET)
      fetch(url, {
        method: 'GET',
        keepalive: true, // Ensures request continues even if page unloads
      })
        .then(() => {
          this.meetingFinishedApiCalled = true;
          console.log('✅ Meeting finished notification sent via fetch (keepalive)');
        })
        .catch((error) => {
          console.warn('⚠️ Fetch keepalive failed:', error);
          // Try async call as fallback (may not complete)
          this.notifyMeetingFinished();
        });
    } catch (error) {
      console.error('❌ Failed to notify meeting finished (sync):', error);
      // Try async as last resort
      this.notifyMeetingFinished();
    }
  }
}
