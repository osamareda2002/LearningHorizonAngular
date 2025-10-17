import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  resetPasswordForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  tokenExpired = false;
  showPassword = false;
  showConfirmPassword = false;
  private resetToken = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get token from URL
    this.resetToken = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.resetToken) {
      this.tokenExpired = true;
      return;
    }

    // Verify token validity
    this.auth.verifyResetToken(this.resetToken).subscribe({
      next: () => {
        this.tokenExpired = false;
      },
      error: () => {
        this.tokenExpired = true;
      },
    });

    this.resetPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const resetData = {
      token: this.resetToken,
      newPassword: this.resetPasswordForm.value.password,
    };

    this.auth.resetPassword(resetData).subscribe({
      next: (res) => {
        console.log('✅ Password reset successful:', res);
        this.loading = false;
        this.successMessage = 'Password reset successful! Redirecting to login...';

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Password reset failed:', err);
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to reset password. Please try again.';
      },
    });
  }
}
