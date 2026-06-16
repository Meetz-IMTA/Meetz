import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = '/api/v1/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http
      .post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        }),
      );
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<{
        email: string;
        accessToken?: string;
        refreshToken?: string;
        user?: any;
      }>(`${this.apiUrl}/register`, { name, email, password })
      .pipe(
        tap((response) => {
          if (response.accessToken && response.refreshToken && response.user) {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        }),
      );
  }

  verifyOtp(email: string, otp: string) {
    return this.http
      .post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>(`${this.apiUrl}/verify-otp`, { email, otp })
      .pipe(
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        }),
      );
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, password });
  }

  logout(refreshToken: string) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return this.http.post(`${this.apiUrl}/logout`, { refreshToken });
  }

  refresh(refreshToken: string) {
    return this.http.post<{ accessToken: string; refreshToken: string }>(`${this.apiUrl}/refresh`, {
      refreshToken,
    });
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getUser() {
    const user = localStorage.getItem('user');
    if (!user) return null;
    const parsed = JSON.parse(user);
    if (typeof parsed.role === 'string') {
      parsed.role = parsed.role.toLowerCase();
    }
    return parsed;
  }

  isLoggedIn() {
    return !!this.getAccessToken();
  }
}
