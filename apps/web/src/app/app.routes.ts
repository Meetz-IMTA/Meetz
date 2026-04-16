import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'verify-otp', component: VerifyOtp },
  { path: 'home', component: Home },
];
