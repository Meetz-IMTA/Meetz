import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Home } from './pages/home/home';
import { MainLayout } from './components/main-layout/main-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'verify-otp', component: VerifyOtp },
  { path: 'forget-password', component: ForgetPassword },
  { path: 'reset-password', component: ResetPassword },
  {
    path: '',
    component: MainLayout,
    children: [{ path: 'home', component: Home }],
  },
];
