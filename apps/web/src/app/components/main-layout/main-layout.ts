import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { Footer } from '../footer/footer';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Footer],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  private auth = inject(Auth);
  private router = inject(Router);

  dropdownOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/home' },
    { label: 'Community', icon: 'group', route: '/community' },
    { label: 'Groups', icon: 'hub', route: '/groups' },
    { label: 'Events', icon: 'calendar_today', route: '/events' },
    { label: 'Amis', icon: 'people', route: '/friends' },
    { label: 'Profil', icon: 'person', route: '/profile' },
  ];

  get userInitial(): string {
    const user = this.auth.getUser();
    return user?.name ? user.name[0].toUpperCase() : 'U';
  }

  get userName(): string {
    return this.auth.getUser()?.name ?? '';
  }

  get userEmail(): string {
    return this.auth.getUser()?.email ?? '';
  }

  toggleDropdown() {
    this.dropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.dropdownOpen.set(false);
    }
  }

  logout() {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    this.auth.logout(refreshToken).subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
