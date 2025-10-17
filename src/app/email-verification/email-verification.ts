import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './email-verification.html',
  styleUrl: './email-verification.css',
})
export class EmailVerification implements OnInit, OnDestroy {
  verificationForm!: FormGroup;
  loading = false;
  resending = false;
  errorMessage = '';
  successMessage = '';
  userEmail = '';
  canResend = false;
  resendTimer = 60;
  private timerInterval: any;
  private pendingRegistration: any;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    // Get pending registration data
    const storedData = sessionStorage.getItem('pendingRegistration');
    if (!storedData) {
      this.router.navigate(['/register']);
      return;
    }

    this.pendingRegistration = JSON.parse(storedData);
    this.userEmail = this.pendingRegistration.email;

    this.verificationForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

    // Start resend timer
    this.startResendTimer();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startResendTimer() {
    this.canResend = false;
    this.resendTimer = 60;

    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.canResend = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onVerify() {
    if (this.verificationForm.invalid) {
      this.errorMessage = 'Please enter a valid 6-digit code.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const verificationData = {
      email: this.userEmail,
      code: this.verificationForm.value.code,
    };

    this.auth.verifyEmailCode(verificationData).subscribe({
      next: (res) => {
        console.log('✅ Verification successful:', res);

        if (res.result === 200) {
          // Now register the user
          this.registerUser();
        } else {
          this.loading = false;
          this.errorMessage = res.message || 'Invalid verification code. Please try again.';
        }
      },
      error: (err) => {
        console.error('❌ Verification failed:', err);
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid verification code. Please try again.';
      },
    });
  }

  registerUser() {
    this.auth.register(this.pendingRegistration).subscribe({
      next: (res) => {
        console.log('✅ Registration successful:', res);
        this.loading = false;

        if (res.result === 200) {
          this.successMessage = 'Account created successfully! Redirecting...';

          // Clear pending data
          sessionStorage.removeItem('pendingRegistration');

          // Navigate to additional info page
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        } else {
          this.errorMessage = res.message || 'Registration failed. Please try again.';
        }
      },
      error: (err) => {
        console.error('❌ Registration failed:', err);
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }

  onResendCode() {
    this.resending = true;
    this.errorMessage = '';

    this.auth.sendVerificationCode(this.userEmail).subscribe({
      next: (res) => {
        console.log('✅ Code resent:', res);
        this.resending = false;

        if (res.result === 200) {
          this.successMessage = 'Verification code resent successfully!';
          this.startResendTimer();

          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        } else {
          this.errorMessage = 'Failed to resend code. Please try again.';
        }
      },
      error: (err) => {
        console.error('❌ Failed to resend code:', err);
        this.resending = false;
        this.errorMessage = 'Failed to resend code. Please try again.';
      },
    });
  }
}
