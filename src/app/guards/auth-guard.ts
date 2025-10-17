import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    const token = this.auth.getToken();

    if (!token) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // ✅ Call your backend to check if token is valid
    return this.auth.checkToken().pipe(
      map((res: any) => {
        if (res?.isValid === true) {
          return true;
        } else {
          this.auth.logout();
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(() => {
        this.auth.logout();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
