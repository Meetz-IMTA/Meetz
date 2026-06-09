import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth } from './auth';
import type { Friend, FriendRequest, UserRelation } from '../shared/models';

const API = 'http://localhost:3000/api/v1';

@Injectable({ providedIn: 'root' })
export class FriendService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  private readonly _friends = signal<Friend[]>([]);
  private readonly _requests = signal<FriendRequest[]>([]);

  readonly friends = this._friends.asReadonly();
  readonly friendRequests = this._requests.asReadonly();
  readonly incomingRequests = computed(() =>
    this._requests().filter((r) => r.direction === 'incoming'),
  );
  readonly outgoingRequests = computed(() =>
    this._requests().filter((r) => r.direction === 'outgoing'),
  );
  readonly pendingRequestsCount = computed(() => this.incomingRequests().length);

  constructor() {
    if (this.auth.isLoggedIn()) {
      this.loadAll();
    }
  }

  loadAll(): void {
    this.loadFriends();
    this.loadRequests();
  }

  private loadFriends(): void {
    this.http.get<any[]>(`${API}/friends`).subscribe({
      next: (data) => this._friends.set(data.map(this.mapFriend.bind(this))),
      error: () => {},
    });
  }

  private loadRequests(): void {
    this.http.get<any>(`${API}/friends/requests`).subscribe({
      next: (data) => {
        const all: FriendRequest[] = [
          ...data.incoming.map((r: any) => this.mapRequest(r, 'incoming')),
          ...data.outgoing.map((r: any) => this.mapRequest(r, 'outgoing')),
        ];
        this._requests.set(all);
      },
      error: () => {},
    });
  }

  getUserRelation(userId: string): { status: UserRelation; requestId?: string } {
    const currentId = String(this.auth.getUser()?.id ?? '');
    if (userId === currentId) return { status: 'self' };
    if (this._friends().some((f) => f.user.id === userId)) return { status: 'friend' };

    const req = this._requests().find(
      (r) =>
        (r.direction === 'outgoing' && r.to.id === userId) ||
        (r.direction === 'incoming' && r.from.id === userId),
    );
    if (req) {
      return {
        status: req.direction === 'outgoing' ? 'request_sent' : 'request_received',
        requestId: req.id,
      };
    }
    return { status: 'none' };
  }

  sendFriendRequest(userId: string): void {
    this.http.post(`${API}/friends/request/${userId}`, {}).subscribe({
      next: () => this.loadRequests(),
    });
  }

  acceptFriendRequest(requestId: string): void {
    this.http
      .patch(`${API}/friends/request/${requestId}/accept`, {})
      .subscribe({ next: () => this.loadAll() });
  }

  declineFriendRequest(requestId: string): void {
    this.http
      .patch(`${API}/friends/request/${requestId}/decline`, {})
      .subscribe({ next: () => this.loadRequests() });
  }

  cancelFriendRequest(requestId: string): void {
    this.http
      .delete(`${API}/friends/request/${requestId}`)
      .subscribe({ next: () => this.loadRequests() });
  }

  removeFriend(userId: string): void {
    this.http.delete(`${API}/friends/${userId}`).subscribe({ next: () => this.loadFriends() });
  }

  private mapFriend(data: any): Friend {
    return {
      id: String(data.id),
      user: {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl ?? null,
        bannerUrl: data.user.bannerUrl ?? null,
        role: (data.user.role as string).toLowerCase() as any,
        rating: null,
        bio: null,
        joinedAt: new Date(),
        isOnline: false,
      },
      since: new Date(data.since),
    };
  }

  private mapRequest(data: any, direction: 'incoming' | 'outgoing'): FriendRequest {
    const authUser = this.auth.getUser();
    const currentUser = {
      id: String(authUser?.id ?? ''),
      name: authUser?.name ?? '',
      email: authUser?.email ?? '',
      avatarUrl: authUser?.avatarUrl ?? null,
      bannerUrl: authUser?.bannerUrl ?? null,
      role: ((authUser?.role ?? 'USER') as string).toLowerCase() as any,
      rating: null,
      bio: null,
      joinedAt: new Date(),
      isOnline: true,
    };

    const otherRaw = direction === 'incoming' ? data.from : data.to;
    const otherUser = {
      id: String(otherRaw.id),
      name: otherRaw.name,
      email: otherRaw.email,
      avatarUrl: otherRaw.avatarUrl ?? null,
      bannerUrl: otherRaw.bannerUrl ?? null,
      role: (otherRaw.role as string).toLowerCase() as any,
      rating: null,
      bio: null,
      joinedAt: new Date(),
      isOnline: false,
    };

    return {
      id: String(data.id),
      from: direction === 'incoming' ? otherUser : currentUser,
      to: direction === 'incoming' ? currentUser : otherUser,
      sentAt: new Date(data.sentAt),
      direction,
    };
  }
}
