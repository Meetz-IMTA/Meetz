import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Home } from './pages/home/home';
import { MainLayout } from './components/main-layout/main-layout';
import { authGuard } from './guards/auth.guard';
import { EventsList } from './pages/events/events-list/events-list';
import { EventDetail } from './pages/events/event-detail/event-detail';
import { EditEvent } from './pages/events/edit-event/edit-event';
import { FriendListComponent } from './features/friends/friend-list.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ProfileEditComponent } from './features/profile/profile-edit.component';
import { SettingsComponent } from './features/settings/settings.component';
import { FriendSearchComponent } from './features/friends/friend-search.component';
import { Community } from './pages/community/community';
import { CommunityCategory } from './pages/community/category/category';
import { CommunityThread } from './pages/community/thread/thread';
import { CreateThread } from './pages/community/create-thread/create-thread';
import { EditThread } from './pages/community/edit-thread/edit-thread';

const routes: Routes = [
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
      { path: 'community', component: Community },
      { path: 'community/create', component: CreateThread },
      { path: 'community/category/:id', component: CommunityCategory },
      { path: 'community/thread/:id', component: CommunityThread },
      { path: 'community/thread/:id/edit', component: EditThread },
      { path: 'events', component: EventsList },
      { path: 'events/:id', component: EventDetail },
      { path: 'events/:id/edit', component: EditEvent },
      { path: 'friends', component: FriendListComponent },
      { path: 'friends/search', component: FriendSearchComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile/edit', component: ProfileEditComponent }, // DOIT être avant :id
      { path: 'profile/:id', component: ProfileComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },
];
export default routes;
