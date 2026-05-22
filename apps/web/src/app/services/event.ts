import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from './auth';

export interface EventDto {
  name: string;
  description?: string;
  date: string;
  location?: string;
  category?: string;
  maxAttendees?: number;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/events';
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private get authHeader(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getAccessToken()}` });
  }

  getAll() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(data: EventDto, image?: File) {
    if (image) {
      return this.http.post<any>(this.apiUrl, this.toFormData(data, image), {
        headers: this.authHeader,
      });
    }
    return this.http.post<any>(this.apiUrl, data, { headers: this.authHeader });
  }

  update(id: number, data: Partial<EventDto>, image?: File) {
    if (image) {
      return this.http.put<any>(`${this.apiUrl}/${id}`, this.toFormData(data, image), {
        headers: this.authHeader,
      });
    }
    return this.http.put<any>(`${this.apiUrl}/${id}`, data, { headers: this.authHeader });
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.authHeader });
  }

  private toFormData(data: Partial<EventDto>, image: File): FormData {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.description) form.append('description', data.description);
    if (data.date) form.append('date', data.date);
    if (data.location) form.append('location', data.location);
    if (data.category) form.append('category', data.category);
    if (data.maxAttendees != null) form.append('maxAttendees', String(data.maxAttendees));
    form.append('image', image);
    return form;
  }
}
