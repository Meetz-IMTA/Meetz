import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Home } from './pages/home/home';
import { CreateEvent } from './pages/create-event/create-event';
import { MainLayout } from './components/main-layout/main-layout';
import { authGuard } from './guards/auth.guard';
import { FriendListComponent } from './features/friends/friend-list.component';
import { FriendSearchComponent } from './features/friends/friend-search.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ProfileEditComponent } from './features/profile/profile-edit.component';
import { SettingsComponent } from './features/settings/settings.component';

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
      { path: 'friends', component: FriendListComponent },
      { path: 'friends/search', component: FriendSearchComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile/edit', component: ProfileEditComponent }, // DOIT être avant :id
      { path: 'profile/:id', component: ProfileComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },
];
