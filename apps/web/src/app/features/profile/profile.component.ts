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

  readonly isCreator = computed(() => this.profile()?.role === 'creator');
  readonly friends = this.friendService.friends;

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
    this.userService.submitReport(p.id, event.reason, event.details);
    this.reportOpen.set(false);
    this.reportConfirmed.set(true);
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

  memberSince(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(date),
    );
  }
  eventDate(date: Date): string {
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
  trackCoopt(_: number, c: CooptationEntry): string {
    return c.user.id;
  }
  trackFriend(_: number, f: Friend): string {
    return f.id;
  }
}
