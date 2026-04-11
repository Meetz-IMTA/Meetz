import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = 'http://localhost:3000/api/v1/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ user: any; accessToken: string; refreshToken: string }>(
      `${this.apiUrl}/login`,
      { email, password }
    ).pipe(
      tap((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
      })
    );
  }

  register(name: string, email: string, password: string) {
    return this.http.post<{ email: string; accessToken?: string; refreshToken?: string; user?: any }>(
      `${this.apiUrl}/register`,
      { name, email, password }
    ).pipe(
      tap((response) => {
        if (response.accessToken && response.refreshToken && response.user) {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  verifyOtp(email: string, otp: string) {
    return this.http.post<{ user: any; accessToken: string; refreshToken: string }>(
      `${this.apiUrl}/verify-otp`,
      { email, otp }
    ).pipe(
      tap((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
      })
    );
  }

  logout(refreshToken: string) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return this.http.post(`${this.apiUrl}/logout`, { refreshToken });
  }

  refresh(refreshToken: string) {
    return this.http.post<{ accessToken: string; refreshToken: string }>(
      `${this.apiUrl}/refresh`,
      { refreshToken }
    );
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn() {
    return !!this.getAccessToken();
  }
}
