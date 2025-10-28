import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllMaterials(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllCourses`);
  }

  getEnrolledCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetPurchasedCourses`);
  }

  // Get course by ID
  getCourseById(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetCourseById?id=${courseId}`);
  }

  // Get course lessons
  getCourseLessons(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetLessonsByCourseId?courseId=${courseId}`);
  }

  goToPayment(courseId: number): Observable<any> {
    const token = localStorage.getItem('jwtToken');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(`${this.apiUrl}/PurchaseCourse`, { courseId }, { headers });
  }
}
