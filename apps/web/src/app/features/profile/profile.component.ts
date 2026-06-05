import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { map } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { RoleBadgeComponent } from '../../shared/components/role-badge/role-badge.component';
import { ReportDialogComponent } from '../../shared/components/report-dialog/report-dialog.component';
import type {
  Badge,
  CooptationEntry,
  EventSummary,
  Friend,
  ReportReason,
  UserRelation,
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
  private readonly mockData = inject(MockDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  readonly profile = computed(() => {
    const id = this.routeId() ?? this.mockData.currentUser().id;
    return this.mockData.getUserProfile(id);
  });

  readonly isOwner = computed(() => {
    const id = this.routeId();
    return !id || id === this.mockData.currentUser().id;
  });

  readonly relation = computed<{ status: UserRelation; requestId?: string }>(() => {
    const p = this.profile();
    if (!p) return { status: 'none' };
    return this.mockData.getUserRelation(p.id);
  });

  readonly isCreator = computed(() => this.profile()?.role === 'creator');

  /** Liste des amis de l'utilisateur courant (visible sur son propre profil). */
  readonly friends = this.mockData.friends;

  // Signalement
  readonly reportOpen = signal(false);
  readonly reportConfirmed = signal(false);

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
    this.mockData.submitReport(p.id, event.reason, event.details);
    this.reportOpen.set(false);
    this.reportConfirmed.set(true);
  }

  // Navigation
  goBack(): void {
    this.location.back();
  }

  // Actions amis
  addFriend(): void {
    const p = this.profile();
    if (p) this.mockData.sendFriendRequest(p.id);
  }
  acceptRequest(): void {
    const id = this.relation().requestId;
    if (id) this.mockData.acceptFriendRequest(id);
  }
  declineRequest(): void {
    const id = this.relation().requestId;
    if (id) this.mockData.declineFriendRequest(id);
  }
  cancelRequest(): void {
    const id = this.relation().requestId;
    if (id) this.mockData.cancelFriendRequest(id);
  }
  removeFriend(): void {
    const p = this.profile();
    if (p) this.mockData.removeFriend(p.id);
  }

  // Formatage
  memberSince(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  }
  eventDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
  }

  trackBadge(_: number, b: Badge): string {
    return b.id;
  }
  trackEvent(_: number, e: EventSummary): string {
    return e.id;
  }
  trackCoopt(_: number, c: CooptationEntry): string {
    return c.user.id;
  }
  trackFriend(_: number, f: Friend): string {
    return f.id;
  }
}
