import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from './enviroment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.auth}`;

  constructor(private http: HttpClient) {}

  // ✅ Normal login
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        // Only store token if login was successful (result === 200)
        if (res.result === 200 && res.token) {
          localStorage.setItem('jwtToken', res.token);
          const decoded: any = jwtDecode(res.token);
          localStorage.setItem('userData', JSON.stringify(decoded));
        }
      })
    );
  }

  // Send email verification code
  sendVerificationCode(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-verification-code`, { email });
  }

  // Verify email code
  verifyEmailCode(data: { email: string; code: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-email-code`, data);
  }

  // ✅ Register new user
  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ForgotPassword`, { email });
  }

  // Verify reset token
  verifyResetToken(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-reset-token`, { token });
  }

  // Reset password
  resetPassword(data: { token: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  sendGoogleTokenToBackend(idToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/GoogleSignIn`, { IdToken: idToken }).pipe(
      tap((res: any) => {
        localStorage.setItem('jwtToken', res.token);
        const decoded: any = jwtDecode(res.token);
        localStorage.setItem('userData', JSON.stringify(decoded));
      })
    );
  }

  checkToken(): Observable<any> {
    const token = localStorage.getItem('jwtToken');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get(`${this.apiUrl}/validate-token`, { headers });
  }

  logout() {
    localStorage.clear();
  }

  getToken() {
    return localStorage.getItem('jwtToken');
  }

  getUserData() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  getUserName(): string {
    const userData: any = this.getUserData();
    return userData ? `${userData.firstName} ${userData.lastName}` : 'Guest';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('jwtToken');
  }

  isAdmin(): boolean {
    const userData: any = this.getUserData();
    return userData?.isAdmin == 'True' ? true : false;
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-password-reset`, { email });
  }
}
