import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';

export interface DtoGetUser {
  id: number;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  profilePicURL: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.horizon}`; // Adjust based on your API structure

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<DtoGetUser[]> {
    return this.http.get<DtoGetUser[]>(`${this.apiUrl}/GetAllUsers`);
  }
}
