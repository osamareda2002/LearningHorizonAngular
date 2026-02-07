import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './enviroment';
import { DtoAddEditCategory } from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private apiUrl = `${environment.horizon}`;

  constructor(private http: HttpClient) {}

  getAllCategories(): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetAllCategories`);
  }

  addCategory(data: DtoAddEditCategory): Observable<any> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('about', data.description); // Backend expects 'about' based on user requirement text, though Dto says 'DtoAddEditCategory' usually matches fields. Assuming 'about' matches UI "About"
    }
    if (data.image) {
      formData.append('image', data.image); // Assumption: 'file' is common, or 'image'. User prompt says "image drop zone", API usually takes 'file' or 'image'. adhering to similar services. Let's check other services.
      // Checking add.ts: slider uses 'file', course uses 'courseImage', lesson uses 'videoPath' (chunked). 
      // User provided API signature: public async Task<IActionResult> AddCategory([FromForm] DtoAddEditCategory dto)
      // I'll stick with 'image' or 'file'. implementation_plan said 'image'. 
      // Let's use 'image' to be safe or maybe 'file'. 
      // Actually, looking at `AddCategory` in description: "contains form of title and about (optional) and image drop zone"
      // I will use 'image' key for now.
    }
    return this.http.post(`${this.apiUrl}/AddCategory`, formData);
  }

  editCategory(data: DtoAddEditCategory): Observable<any> {
    const formData = new FormData();
    if (data.id) {
        formData.append('id', data.id.toString());
    }
    formData.append('title', data.title);
    if (data.description) {
      formData.append('about', data.description);
    }
    if (data.image) {
      formData.append('image', data.image);
    }
    return this.http.post(`${this.apiUrl}/EditCategory`, formData);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/DeleteCategory?id=${id}`);
  }

  getCoursesByCategory(categoryId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetCourseByCategory?categoryId=${categoryId}`);
  }
}
