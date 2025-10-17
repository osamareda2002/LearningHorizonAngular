import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllBooks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllBooks`);
  }

  getCoverImage(id: number): string {
    return `${this.apiUrl}/GetBookCoverImage?id=${id}`;
  }

  getBookFile(id: number): string {
    return `${this.apiUrl}/GetBookFile?id=${id}`;
  }
}
