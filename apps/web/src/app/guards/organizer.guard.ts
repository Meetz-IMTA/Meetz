import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/** Réserve une route aux organisateurs (et aux admins). */
export const organizerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const role = auth.getUser()?.role;
  if (role !== 'organizer' && role !== 'admin') {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
