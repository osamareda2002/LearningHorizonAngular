import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

@Injectable({
  providedIn: 'root',
})
export class Suggestion {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllSuggestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllSuggestions`);
  }

  getSuggestionFileUrl(id: number): string {
    return `${this.apiUrl}/GetSuggestionFile?id=${id}`;
  }
}
