import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  AdminStats,
  AdminReport,
  AdminReportsResponse,
  AdminUsersResponse,
  ReportStatus,
} from '../shared/models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = '/api/v1/admin';

  getStats() {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }

  getReports(filters: { type?: string; status?: string; page?: number; limit?: number }) {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page != null) params = params.set('page', String(filters.page));
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    return this.http.get<AdminReportsResponse>(`${this.base}/reports`, { params });
  }

  updateReportStatus(id: number, status: ReportStatus) {
    return this.http.patch<AdminReport>(`${this.base}/reports/${id}/status`, { status });
  }

  banUser(userId: number, reason?: string) {
    return this.http.post(`${this.base}/users/${userId}/ban`, { reason });
  }

  unbanUser(userId: number) {
    return this.http.post(`${this.base}/users/${userId}/unban`, {});
  }

  getUsers(filters: { search?: string; banned?: boolean; page?: number; limit?: number }) {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.banned != null) params = params.set('banned', String(filters.banned));
    if (filters.page != null) params = params.set('page', String(filters.page));
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    return this.http.get<AdminUsersResponse>(`${this.base}/users`, { params });
  }

  deleteThread(threadId: number) {
    return this.http.delete(`${this.base}/threads/${threadId}`);
  }

  deleteComment(commentId: number) {
    return this.http.delete(`${this.base}/comments/${commentId}`);
  }
}
