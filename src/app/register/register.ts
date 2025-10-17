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
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
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
    if (!password || !confirmPassword) return null;
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly.';
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { firstName, lastName, email, password } = this.registerForm.value;

    // Send verification code
    this.auth.sendVerificationCode(email).subscribe({
      next: (res) => {
        console.log('✅ Verification code sent:', res);
        this.loading = false;

        if (res.result === 200) {
          sessionStorage.setItem(
            'pendingRegistration',
            JSON.stringify({
              firstName,
              lastName,
              email,
              password,
            })
          );
          this.router.navigate(['/email-verification']);
        } else if (res.result === 409) {
          this.errorMessage = 'This email is already registered';
        } else {
          this.errorMessage = res.message || 'Failed to send verification code. Please try again.';
        }
      },
      error: (err) => {
        console.error('❌ Failed to send verification code:', err);
        this.loading = false;

        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (err.status === 409) {
          this.errorMessage = 'This email is already registered';
        } else {
          this.errorMessage =
            err.error?.message || 'Failed to send verification code. Please try again.';
        }
      },
    });
  }
}
