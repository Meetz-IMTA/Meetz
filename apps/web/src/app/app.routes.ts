import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Home } from './pages/home/home';
import { CreateEvent } from './pages/create-event/create-event';
import { MainLayout } from './components/main-layout/main-layout';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'verify-otp', component: VerifyOtp },
  { path: 'forget-password', component: ForgetPassword },
  { path: 'reset-password', component: ResetPassword },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: Home },
      { path: 'create-event', component: CreateEvent },
    ],
  },
];
