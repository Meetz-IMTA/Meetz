import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Auth } from './auth';
import { Category, Comment, Paginated, Thread } from '../models/community.model';

export interface ThreadQuery {
  categoryId?: number;
  search?: string;
  authorId?: number;
  sort?: 'recent' | 'popular';
  page?: number;
  limit?: number;
}

export interface ThreadPayload {
  title: string;
  content: string;
  categoryId: number;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly apiUrl = '/api/v1/community';
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private get authHeader(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getAccessToken()}` });
  }

  // ── Categories ──
  getCategories() {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getCategory(id: number) {
    return this.http.get<Category>(`${this.apiUrl}/categories/${id}`);
  }

  // ── Threads ──
  getThreads(query: ThreadQuery = {}) {
    let params = new HttpParams();
    if (query.categoryId != null) params = params.set('categoryId', String(query.categoryId));
    if (query.authorId != null) params = params.set('authorId', String(query.authorId));
    if (query.search) params = params.set('search', query.search);
    if (query.sort) params = params.set('sort', query.sort);
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.limit != null) params = params.set('limit', String(query.limit));
    return this.http.get<Paginated<Thread>>(`${this.apiUrl}/threads`, { params });
  }

  getThread(id: number) {
    return this.http.get<Thread>(`${this.apiUrl}/threads/${id}`, { headers: this.authHeader });
  }

  createThread(data: ThreadPayload, images: File[] = []) {
    return this.http.post<Thread>(`${this.apiUrl}/threads`, this.toFormData(data, images), {
      headers: this.authHeader,
    });
  }

  updateThread(
    id: number,
    data: Partial<ThreadPayload>,
    images: File[] = [],
    removedImageIds: number[] = [],
  ) {
    const form = this.toFormData(data, images);
    if (removedImageIds.length) form.append('removedImageIds', removedImageIds.join(','));
    return this.http.put<Thread>(`${this.apiUrl}/threads/${id}`, form, {
      headers: this.authHeader,
    });
  }

  deleteThread(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/threads/${id}`, { headers: this.authHeader });
  }

  toggleLike(id: number) {
    return this.http.post<{ liked: boolean; likesCount: number }>(
      `${this.apiUrl}/threads/${id}/like`,
      {},
      { headers: this.authHeader },
    );
  }

  reportThread(id: number, reason?: string) {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/threads/${id}/report`,
      { reason },
      { headers: this.authHeader },
    );
  }

  // ── Comments ──
  addComment(
    threadId: number,
    payload: { content?: string; parentCommentId?: number; image?: File; gifUrl?: string },
  ) {
    const form = new FormData();
    if (payload.content) form.append('content', payload.content);
    if (payload.parentCommentId != null)
      form.append('parentCommentId', String(payload.parentCommentId));
    if (payload.gifUrl) form.append('gifUrl', payload.gifUrl);
    if (payload.image) form.append('image', payload.image);
    return this.http.post<Comment>(`${this.apiUrl}/threads/${threadId}/comments`, form, {
      headers: this.authHeader,
    });
  }

  deleteComment(commentId: number) {
    return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`, {
      headers: this.authHeader,
    });
  }

  toggleCommentLike(commentId: number) {
    return this.http.post<{ liked: boolean; likesCount: number }>(
      `${this.apiUrl}/comments/${commentId}/like`,
      {},
      { headers: this.authHeader },
    );
  }

  reportComment(commentId: number, reason?: string) {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/comments/${commentId}/report`,
      { reason },
      { headers: this.authHeader },
    );
  }

  private toFormData(data: Partial<ThreadPayload>, images: File[]): FormData {
    const form = new FormData();
    if (data.title) form.append('title', data.title);
    if (data.content) form.append('content', data.content);
    if (data.categoryId != null) form.append('categoryId', String(data.categoryId));
    for (const image of images) form.append('images', image);
    return form;
  }
}
