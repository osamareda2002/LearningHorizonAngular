import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from './enviroment';
import { TeamMember } from '../models/team.model';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) { }

  /**
   * Get all team members (instructors) from the backend API
   */
  getAllTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<{ status: number; data: any[] }>(`${this.apiUrl}/GetAllInstructors`).pipe(
      map(response => {
        return response.data.map(instructor => ({
          id: instructor.id,
          name: instructor.name,
          specialty: instructor.specialty,
          imageUrl: instructor.imageUrl || null,
          about: instructor.description,
          expertise: instructor.expertise ? instructor.expertise.split(',').map((e: string) => e.trim()) : [],
          isDeveloper: instructor.isDeveloper ?? false,
          tag: instructor.tag || null,
          contact: {
            instagram: instructor.instgramUrl || undefined,
            whatsapp: instructor.whatsappUrl || undefined,
            facebook: instructor.facebookUrl || undefined,
          }
        }));
      })
    );
  }

  /**
   * Get team member by ID
   */
  getTeamMemberById(id: number): Observable<TeamMember | undefined> {
    return this.getAllTeamMembers().pipe(
      map(members => members.find(m => m.id === id))
    );
  }

  /**
   * Add a new instructor
   */
  addInstructor(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/AddNewInstructor`, formData);
  }

  /**
   * Update an existing instructor
   */
  updateInstructor(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/EditInstructor`, formData);
  }

  /**
   * Delete an instructor by ID
   */
  deleteInstructor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/DeleteInstructor?id=${id}`);
  }
}

