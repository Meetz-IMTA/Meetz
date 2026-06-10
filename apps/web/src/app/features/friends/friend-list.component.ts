import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { RoleBadgeComponent } from '../../shared/components/role-badge/role-badge.component';
import type { Friend, FriendRequest } from '../../shared/models';

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [RouterLink, AvatarComponent, StarRatingComponent, RoleBadgeComponent],
  templateUrl: './friend-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendListComponent implements OnInit {
  private readonly friendService = inject(FriendService);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.friendService.loadAll();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'requests') this.activeTab.set('requests');
  }

  readonly activeTab = signal<'friends' | 'requests'>('friends');
  readonly searchQuery = signal('');

  readonly friends = this.friendService.friends;
  readonly incomingRequests = this.friendService.incomingRequests;
  readonly outgoingRequests = this.friendService.outgoingRequests;
  readonly pendingCount = this.friendService.pendingRequestsCount;

  readonly filteredFriends = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.friends();
    return this.friends().filter(
      (f) => f.user.name.toLowerCase().includes(q) || f.user.email.toLowerCase().includes(q),
    );
  });

  readonly hasNoRequests = computed(
    () => this.incomingRequests().length === 0 && this.outgoingRequests().length === 0,
  );

  setTab(tab: 'friends' | 'requests'): void {
    this.activeTab.set(tab);
  }
  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  acceptRequest(id: string): void {
    this.friendService.acceptFriendRequest(id);
  }
  declineRequest(id: string): void {
    this.friendService.declineFriendRequest(id);
  }
  cancelRequest(id: string): void {
    this.friendService.cancelFriendRequest(id);
  }
  removeFriend(userId: string): void {
    this.friendService.removeFriend(userId);
  }
  timeAgo(date: Date): string {
    return this.userService.timeAgo(date);
  }

  trackFriend(_: number, f: Friend): string {
    return f.id;
  }
  trackRequest(_: number, r: FriendRequest): string {
    return r.id;
  }
}
