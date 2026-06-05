import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { Auth } from './auth';
import { MeetzEvent } from '../models/event.model';

export interface EventDto {
  name: string;
  description?: string;
  date: string;
  location?: string;
  category?: string;
  maxAttendees?: number;
  imageUrl?: string;
}

export interface EventFilters {
  category?: string;
  search?: string;
  organizerId?: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/events';
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private readonly cache = new Map<string, { data: MeetzEvent[]; at: number }>();
  private readonly TTL = 60_000;

  hasCachedAll(filters?: EventFilters): boolean {
    const key = JSON.stringify(filters ?? {});
    const hit = this.cache.get(key);
    return !!hit && Date.now() - hit.at < this.TTL;
  }

  private get authHeader(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getAccessToken()}` });
  }

  getAll(filters?: EventFilters) {
    const key = JSON.stringify(filters ?? {});
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.TTL) return of(hit.data);

    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.organizerId != null)
      params = params.set('organizerId', String(filters.organizerId));

    return this.http
      .get<MeetzEvent[]>(this.apiUrl, { params })
      .pipe(tap((data) => this.cache.set(key, { data, at: Date.now() })));
  }

  getById(id: number) {
    return this.http.get<MeetzEvent>(`${this.apiUrl}/${id}`, { headers: this.authHeader });
  }

  create(data: EventDto, image?: File) {
    const req = image
      ? this.http.post<MeetzEvent>(this.apiUrl, this.toFormData(data, image), {
          headers: this.authHeader,
        })
      : this.http.post<MeetzEvent>(this.apiUrl, data, { headers: this.authHeader });
    return req.pipe(tap(() => this.cache.clear()));
  }

  update(id: number, data: Partial<EventDto>, image?: File) {
    const req = image
      ? this.http.put<MeetzEvent>(`${this.apiUrl}/${id}`, this.toFormData(data, image), {
          headers: this.authHeader,
        })
      : this.http.put<MeetzEvent>(`${this.apiUrl}/${id}`, data, { headers: this.authHeader });
    return req.pipe(tap(() => this.cache.clear()));
  }

  delete(id: number) {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`, { headers: this.authHeader })
      .pipe(tap(() => this.cache.clear()));
  }

  join(id: number) {
    return this.http.post<{ joined: boolean }>(
      `${this.apiUrl}/${id}/join`,
      {},
      { headers: this.authHeader },
    );
  }

  leave(id: number) {
    return this.http.delete<{ joined: boolean }>(`${this.apiUrl}/${id}/join`, {
      headers: this.authHeader,
    });
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
