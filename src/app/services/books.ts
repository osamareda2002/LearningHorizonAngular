import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

export interface DtoGetBook {
  id: number;
  title: string;
  description: string;
  posterLink: string;
  fileLink: string;
  categoric: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllBooks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllBooks`);
  }

  getBooksByCategory(categoryId: number): Observable<DtoGetBook[]> {
    return this.http.get<DtoGetBook[]>(`${this.apiUrl}/GetBooksByCategory?categoryId=${categoryId}`);
  }

  addBook(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/AddNewBook`, formData);
  }

  getCoverImage(id: number): string {
    return `${this.apiUrl}/GetBookCoverImage?id=${id}`;
  }

  getBookFile(id: number): string {
    return `${this.apiUrl}/GetBookFile?id=${id}`;
  }
}

