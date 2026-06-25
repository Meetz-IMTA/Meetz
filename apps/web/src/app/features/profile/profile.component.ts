import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { FriendService } from '../../services/friend.service';
import { EventService } from '../../services/event';
import { ToastService } from '../../services/toast';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { RoleBadgeComponent } from '../../shared/components/role-badge/role-badge.component';
import { ReportDialogComponent } from '../../shared/components/report-dialog/report-dialog.component';
import type { MeetzEvent } from '../../models/event.model';
import type {
  Badge,
  CooptationEntry,
  EventSummary,
  Friend,
  ReportReason,
  UserRelation,
  UserProfile,
} from '../../shared/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    AvatarComponent,
    StarRatingComponent,
    RoleBadgeComponent,
    ReportDialogComponent,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly userService = inject(UserService);
  private readonly friendService = inject(FriendService);
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  readonly profileResource = resource<UserProfile | null, string | null>({
    params: () => this.routeId(),
    loader: ({ params: id }) => {
      const currentUser = this.userService.currentUser();
      if (!id || id === currentUser?.id) {
        return firstValueFrom(this.userService.getMyProfile());
      }
      return firstValueFrom(this.userService.getUserProfile(Number(id)));
    },
  });

  readonly profile = computed(() => this.profileResource.value() ?? null);
  readonly isLoading = computed(() => this.profileResource.isLoading());

  readonly eventsResource = resource<
    MeetzEvent[],
    { routeId: string | null; userId: string | null }
  >({
    params: () => ({
      routeId: this.routeId(),
      userId: this.userService.currentUser()?.id ?? null,
    }),
    loader: ({ params }) => {
      const organizerId = params.routeId
        ? Number(params.routeId)
        : params.userId
          ? Number(params.userId)
          : null;
      if (organizerId == null) return Promise.resolve([]);
      // timeframe=all : on récupère aussi les événements passés pour
      // alimenter la section « Historique ».
      return firstValueFrom(this.eventService.getAll({ organizerId, timeframe: 'all' }));
    },
  });

  readonly profileEvents = computed(() => this.eventsResource.value() ?? []);

  /** Événements à venir, affichés dans la section principale. */
  readonly upcomingEvents = computed(() =>
    this.profileEvents().filter((e) => this.eventStatus(e.date) === 'upcoming'),
  );

  /** Événements passés, affichés en historique (les plus récents d'abord). */
  readonly pastEvents = computed(() =>
    this.profileEvents()
      .filter((e) => this.eventStatus(e.date) === 'past')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  );

  readonly isOwner = computed(() => {
    const id = this.routeId();
    const currentUser = this.userService.currentUser();
    return !id || id === currentUser?.id;
  });

  readonly relation = computed<{ status: UserRelation; requestId?: string }>(() => {
    const p = this.profile();
    if (!p) return { status: 'none' };
    return this.friendService.getUserRelation(p.id);
  });

  readonly isOrganizer = computed(() => this.profile()?.role === 'organizer');
  readonly friends = this.friendService.friends;

  /** L'utilisateur courant peut-il créer des événements ? (organisateur/admin) */
  readonly canCreateEvents = computed(() => {
    const role = this.userService.currentUser()?.role;
    return role === 'organizer' || role === 'admin';
  });

  /**
   * Le visiteur peut-il coopter ce profil ? Il doit être organisateur (ou
   * admin), ami avec la cible, et la cible doit être un simple membre. Pour un
   * organisateur, le quota restant doit être > 0.
   */
  readonly canCoopt = computed(() => {
    if (this.isOwner()) return false;
    const me = this.userService.currentUser();
    const target = this.profile();
    if (!me || !target) return false;
    if (me.role !== 'organizer' && me.role !== 'admin') return false;
    if (this.relation().status !== 'friend') return false;
    if (target.role !== 'user') return false;
    if (me.role === 'organizer') {
      const used = me.cooptationsUsed ?? 0;
      const max = me.cooptationsMax ?? 0;
      if (used >= max) return false;
    }
    return true;
  });

  // Cooptation
  readonly cooptOpen = signal(false);
  readonly cooptLoading = signal(false);

  /** Cooptations restantes de l'utilisateur courant (null = illimité, ex. admin). */
  readonly cooptRemaining = computed(() => {
    const me = this.userService.currentUser();
    if (!me || me.role === 'admin' || me.cooptationsMax === null) return null;
    return Math.max(0, me.cooptationsMax - (me.cooptationsUsed ?? 0));
  });

  // Signalement
  readonly reportOpen = signal(false);
  readonly reportConfirmed = signal(false);

  openCoopt(): void {
    this.cooptOpen.set(true);
  }
  closeCoopt(): void {
    if (!this.cooptLoading()) this.cooptOpen.set(false);
  }

  confirmCoopt(): void {
    const target = this.profile();
    if (!target || this.cooptLoading()) return;
    this.cooptLoading.set(true);
    this.userService.coopt(target.id).subscribe({
      next: () => {
        this.toast.success(`${target.name} est désormais organisateur.`);
        this.cooptLoading.set(false);
        this.cooptOpen.set(false);
        // Rafraîchit le profil affiché et le quota de l'utilisateur courant.
        this.profileResource.reload();
        this.userService.loadCurrentUser();
      },
      error: (err) => {
        this.cooptLoading.set(false);
        this.toast.error(err?.error?.message ?? 'La cooptation a échoué.');
      },
    });
  }

  openReport(): void {
    this.reportConfirmed.set(false);
    this.reportOpen.set(true);
  }
  closeReport(): void {
    this.reportOpen.set(false);
  }

  onReportSubmitted(event: { reason: ReportReason; details: string | null }): void {
    const p = this.profile();
    if (!p) return;
    this.reportOpen.set(false);
    this.userService.submitReport(p.id, event.reason, event.details).subscribe({
      next: () => this.reportConfirmed.set(true),
      error: () => this.reportConfirmed.set(true),
    });
  }

  goBack(): void {
    this.location.back();
  }

  addFriend(): void {
    const p = this.profile();
    if (p) this.friendService.sendFriendRequest(p.id);
  }
  acceptRequest(): void {
    const id = this.relation().requestId;
    if (id) this.friendService.acceptFriendRequest(id);
  }
  declineRequest(): void {
    const id = this.relation().requestId;
    if (id) this.friendService.declineFriendRequest(id);
  }
  cancelRequest(): void {
    const id = this.relation().requestId;
    if (id) this.friendService.cancelFriendRequest(id);
  }
  removeFriend(): void {
    const p = this.profile();
    if (p) this.friendService.removeFriend(p.id);
  }

  eventStatus(date: string): 'upcoming' | 'past' {
    return new Date(date) > new Date() ? 'upcoming' : 'past';
  }

  memberSince(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(date),
    );
  }
  eventDate(date: Date | string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
      new Date(date),
    );
  }

  trackBadge(_: number, b: Badge): string {
    return b.id;
  }
  trackEvent(_: number, e: EventSummary): string {
    return e.id;
  }
  trackMeetzEvent(_: number, e: MeetzEvent): number {
    return e.id;
  }
  trackCoopt(_: number, c: CooptationEntry): string {
    return c.user.id;
  }
  trackFriend(_: number, f: Friend): string {
    return f.id;
  }
}
