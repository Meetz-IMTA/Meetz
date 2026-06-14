import { Component, inject, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { Footer } from '../footer/footer';
import { NotificationService } from '../../services/notification';
import { AppNotification, NotificationType } from '../../models/notification.model';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NOTIF_LABELS: Record<NotificationType, string> = {
  comment: 'a commenté votre thread',
  reply: 'a répondu à votre commentaire',
  thread_like: 'a aimé votre thread',
  comment_like: 'a aimé votre commentaire',
  friend_request: "vous a envoyé une demande d'ami",
  friend_accepted: "a accepté votre demande d'ami",
  event_join: "s'est inscrit·e à votre événement",
  event_leave: "s'est désinscrit·e de votre événement",
  event_full: 'a rempli la dernière place de votre événement',
};

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Footer, TimeAgoPipe, AvatarComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private notifications = inject(NotificationService);

  dropdownOpen = signal(false);

  notifOpen = signal(false);
  notifItems = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  isLoadingNotifs = signal(false);

  private pollHandle?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.refreshUnreadCount();
    this.pollHandle = setInterval(() => this.refreshUnreadCount(), 45_000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private refreshUnreadCount() {
    if (!this.auth.isLoggedIn()) return;
    this.notifications.unreadCount().subscribe({
      next: (res) => this.unreadCount.set(res.unreadCount),
      error: () => {},
    });
  }

  notifLabel(type: NotificationType): string {
    return NOTIF_LABELS[type] ?? '';
  }

  toggleNotif() {
    this.dropdownOpen.set(false);
    const open = !this.notifOpen();
    this.notifOpen.set(open);
    if (open) this.loadNotifications();
  }

  private loadNotifications() {
    this.isLoadingNotifs.set(true);
    this.notifications.list().subscribe({
      next: (res) => {
        this.notifItems.set(res.items);
        this.unreadCount.set(res.unreadCount);
        this.isLoadingNotifs.set(false);
      },
      error: () => this.isLoadingNotifs.set(false),
    });
  }

  openNotification(notif: AppNotification) {
    this.notifOpen.set(false);
    if (!notif.read) {
      this.notifications.markRead(notif.id).subscribe({ error: () => {} });
      this.notifItems.update((items) =>
        items.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      this.unreadCount.update((c) => Math.max(0, c - 1));
    }
    if (notif.type === 'friend_request') {
      this.router.navigate(['/friends'], { queryParams: { tab: 'requests' } });
    } else if (notif.type === 'friend_accepted' && notif.actorId) {
      this.router.navigate(['/profile', notif.actorId]);
    } else if (notif.eventId) {
      this.router.navigate(['/events', notif.eventId]);
    } else if (notif.threadId) {
      const extras = notif.commentId ? { fragment: 'comment-' + notif.commentId } : {};
      this.router.navigate(['/community/thread', notif.threadId], extras);
    }
  }

  markAllRead() {
    this.notifications.markAllRead().subscribe({ error: () => {} });
    this.notifItems.update((items) => items.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  deleteAllNotifications() {
    this.notifications.deleteAll().subscribe({ error: () => {} });
    this.notifItems.set([]);
    this.unreadCount.set(0);
  }

  navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/home' },
    { label: 'Communauté', icon: 'group', route: '/community' },
    { label: 'Événements', icon: 'explore', route: '/events' },
    { label: 'Amis', icon: 'people', route: '/friends' },
    { label: 'Profil', icon: 'person', route: '/profile' },
  ];

  get userInitial(): string {
    const user = this.auth.getUser();
    return user?.name ? user.name[0].toUpperCase() : 'U';
  }

  get userAvatarUrl(): string | null {
    return this.auth.getUser()?.avatarUrl ?? null;
  }

  get userName(): string {
    return this.auth.getUser()?.name ?? '';
  }

  get userEmail(): string {
    return this.auth.getUser()?.email ?? '';
  }

  get isAdmin(): boolean {
    return this.auth.getUser()?.role === 'admin';
  }

  toggleDropdown() {
    this.notifOpen.set(false);
    this.dropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.dropdownOpen.set(false);
      this.notifOpen.set(false);
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
