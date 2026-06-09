import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import type { UserProfile, UserRole } from '../shared/models';
import type { ReportReason } from '../shared/models';

const API = 'http://localhost:3000/api/v1';

// Badges et événements restent en mock jusqu'à l'implémentation backend
const MOCK_BADGES = [
  {
    id: 'b1',
    key: 'first_event',
    label: 'Premier pas',
    description: 'A participé à son premier événement',
    icon: 'celebration',
    earnedAt: new Date('2023-04-01'),
    category: 'participation' as const,
  },
];
const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'Trail du Gardon',
    category: 'Sport',
    date: new Date('2024-03-10'),
    location: 'Alès',
    coverImage: null,
    status: 'past' as const,
  },
];

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  private readonly _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    this.http.get<any>(`${API}/users/me`).subscribe({
      next: (data) => this._currentUser.set(this.mapToProfile(data)),
      error: () => {},
    });
  }

  getUserProfile(id: number): Observable<UserProfile | null> {
    return this.http.get<any>(`${API}/users/${id}`).pipe(
      map(this.mapToProfile.bind(this)),
      catchError(() => of(null)),
    );
  }

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${API}/users/me`).pipe(map(this.mapToProfile.bind(this)));
  }

  updateProfile(data: { name?: string; bio?: string | null }): Observable<UserProfile> {
    return this.http.patch<any>(`${API}/users/me`, data).pipe(
      map((user) => {
        const updated = this.mapToProfile(user);
        this._currentUser.set(updated);
        return updated;
      }),
    );
  }

  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<{ avatarUrl: string }>(`${API}/users/me/avatar`, form).pipe(
      map((res) => {
        this._currentUser.update((u) => (u ? { ...u, avatarUrl: res.avatarUrl } : u));
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            localStorage.setItem(
              'user',
              JSON.stringify({ ...JSON.parse(stored), avatarUrl: res.avatarUrl }),
            );
          } catch {}
        }
        return res;
      }),
    );
  }

  uploadBanner(file: File): Observable<{ bannerUrl: string }> {
    const form = new FormData();
    form.append('banner', file);
    return this.http.post<{ bannerUrl: string }>(`${API}/users/me/banner`, form).pipe(
      map((res) => {
        this._currentUser.update((u) => (u ? { ...u, bannerUrl: res.bannerUrl } : u));
        return res;
      }),
    );
  }
  searchUsers(query: string): Observable<any[]> {
    if (query.trim().length < 2) return of([]);
    return this.http.get<any[]>(`${API}/users/search`, { params: { q: query } }).pipe(
      map((results) =>
        results.map((r) => ({
          user: this.mapToUser(r.user),
          relation: r.relation,
          requestId: r.requestId ? String(r.requestId) : undefined,
        })),
      ),
      catchError(() => of([])),
    );
  }

  submitReport(reportedUserId: string, reason: ReportReason, details: string | null): void {
    // TODO: connecter à POST /api/v1/reports quand l'endpoint sera créé
    console.log('Signalement soumis', { reportedUserId, reason, details });
  }

  timeAgo(date: Date): string {
    const ms = Date.now() - new Date(date).getTime();
    const days = Math.floor(Math.abs(ms) / 86_400_000);
    const future = ms < 0;
    if (days === 0) return "aujourd'hui";
    if (days === 1) return future ? 'demain' : 'hier';
    if (days < 30) return future ? `dans ${days} jours` : `il y a ${days} jours`;
    const months = Math.floor(days / 30);
    return future ? `dans ${months} mois` : `il y a ${months} mois`;
  }

  private mapToUser(data: any) {
    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      role: (data.role as string).toLowerCase() as UserRole,
      rating: null,
      bio: data.bio ?? null,
      joinedAt: new Date(data.createdAt ?? Date.now()),
      isOnline: false,
    };
  }

  private mapToProfile(data: any): UserProfile {
    return {
      ...this.mapToUser(data),
      badges: MOCK_BADGES,
      recentEvents: MOCK_EVENTS,
      cooptations: [],
      friendsCount: data.friendsCount ?? 0,
      eventsCount: data.eventsCount ?? 0,
      cooptationsUsed: null,
      cooptationsMax: null,
    };
  }
}
