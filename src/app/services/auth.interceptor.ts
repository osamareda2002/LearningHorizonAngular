import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth'; // Import your AuthService

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {} // Inject AuthService to get token

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken(); // Use a centralized method to get the token

    // Check if a token exists and if the request is to your API (optional check)
    if (token) {
      // Clone the request and add the Authorization header
      const cloned = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`),
      });

      return next.handle(cloned);
    }

    // If no token, or if you decide not to modify, pass the original request
    return next.handle(request);
  }
}
