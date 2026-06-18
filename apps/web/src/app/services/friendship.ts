import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Auth } from './auth';

interface FriendEntry {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class FriendshipService {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private readonly apiUrl = '/api/v1/friends';

  /**
   * Returns the list of friend user IDs for the current user.
   * Falls back to [] when the endpoint is unavailable (backend not yet implemented).
   */
  getFriendIds(): Observable<number[]> {
    if (!this.auth.isLoggedIn()) return of([]);
    return this.http.get<FriendEntry[]>(this.apiUrl).pipe(
      map((friends) => friends.map((f) => f.id)),
      catchError(() => of([])),
    );
  }
}
