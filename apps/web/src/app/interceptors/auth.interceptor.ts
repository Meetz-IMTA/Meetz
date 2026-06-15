import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';

const API_BASE = 'http://localhost:3000/api/v1';

// Shared single-flight refresh so concurrent 401s trigger only one refresh call.
let refresh$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isApi = req.url.startsWith(API_BASE);
  const isAuthCall = req.url.includes('/auth/');

  let authReq = req;
  const token = auth.getAccessToken();
  if (isApi && token && !req.headers.has('Authorization')) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApi && !isAuthCall) {
        return refreshAndRetry(authReq, next, auth, router);
      }
      return throwError(() => err);
    }),
  );
};

function refreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: Auth,
  router: Router,
): Observable<any> {
  if (!refresh$) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      forceLogout(router);
      return throwError(() => new Error('Session expirée.'));
    }
    refresh$ = auth.refresh(refreshToken).pipe(
      map((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        return res.accessToken;
      }),
      catchError((err) => {
        forceLogout(router);
        return throwError(() => err);
      }),
      shareReplay(1),
      finalize(() => {
        refresh$ = null;
      }),
    );
  }

  return refresh$.pipe(
    switchMap((newToken) =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
    ),
  );
}

function forceLogout(router: Router) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  router.navigate(['/login']);
}
