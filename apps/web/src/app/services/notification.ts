import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from './auth';
import { NotificationList } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/notifications';
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private get authHeader(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getAccessToken()}` });
  }

  list() {
    return this.http.get<NotificationList>(this.apiUrl, { headers: this.authHeader });
  }

  unreadCount() {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`, {
      headers: this.authHeader,
    });
  }

  markAllRead() {
    return this.http.post<void>(`${this.apiUrl}/read`, {}, { headers: this.authHeader });
  }

  markRead(id: number) {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {}, { headers: this.authHeader });
  }
}
