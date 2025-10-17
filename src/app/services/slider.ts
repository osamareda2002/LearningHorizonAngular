import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

@Injectable({
  providedIn: 'root',
})
export class Slider {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllSliders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllSliders`);
  }

  getSliderFileUrl(id: number): string {
    return `${this.apiUrl}/GetSliderFile?id=${id}`;
  }
}
