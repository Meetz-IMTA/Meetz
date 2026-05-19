import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../services/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  private auth = inject(Auth);

  navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/home' },
    { label: 'Community', icon: 'group', route: '/community' },
    { label: 'Groups', icon: 'hub', route: '/groups' },
    { label: 'Events', icon: 'calendar_today', route: '/events' },
  ];

  get userInitial(): string {
    const user = this.auth.getUser();
    return user?.name ? user.name[0].toUpperCase() : 'U';
  }
}
