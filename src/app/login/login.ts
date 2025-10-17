import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm: any;
  loading = false;
  errorMessage = '';
  showPassword = false; // 👈 added
  googleClientId = '37637672345-or3aie3hsmn7h8kk4k0d7vjfft7cqb9u.apps.googleusercontent.com';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.loginForm.patchValue({
        email: rememberedEmail,
        rememberMe: true,
      });
    }

    this.initGoogleSignIn();
  }

  // 👇 Toggle visibility logic
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  initGoogleSignIn() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        clearInterval(checkGoogle);

        google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    }, 100);
  }

  triggerGoogleSignIn() {
    this.loading = true;
    this.errorMessage = '';

    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'g_id_signin_temp';
    document.body.appendChild(buttonDiv);

    google.accounts.id.renderButton(buttonDiv, {
      theme: 'outline',
      size: 'large',
      width: 1,
    });

    setTimeout(() => {
      const btn = buttonDiv.querySelector('div[role="button"]') as HTMLElement;
      if (btn) {
        btn.click();
      } else {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            this.loading = false;
            this.errorMessage = 'Google Sign-In was cancelled or blocked by browser.';
          }
        });
      }
      setTimeout(() => buttonDiv.remove(), 1000);
    }, 100);
  }

  handleCredentialResponse(response: any) {
    if (!response.credential) {
      this.loading = false;
      this.errorMessage = 'Google sign-in failed. No credential received.';
      return;
    }

    this.auth.sendGoogleTokenToBackend(response.credential).subscribe({
      next: (res) => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to authenticate with server.';
      },
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;

        // Check the result code from backend
        if (res.result === 401) {
          this.errorMessage = 'Invalid email or password. Please try again.';
          return;
        }

        if (res.result === 200 && res.token) {
          // Success - save remember me if checked
          if (this.loginForm.value.rememberMe) {
            localStorage.setItem('rememberedEmail', this.loginForm.value.email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
          this.router.navigateByUrl(returnUrl);
        } else {
          this.errorMessage = 'Login failed. Please try again.';
        }
      },
      error: (err) => {
        console.error('❌ Login failed:', err);
        this.loading = false;

        // Handle network/server errors
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          this.errorMessage = err.error?.message || 'An error occurred. Please try again.';
        }
      },
    });
  }

  onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  onRegister() {
    this.router.navigate(['/register']);
  }
}
