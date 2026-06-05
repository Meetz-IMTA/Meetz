import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
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
export class FriendListComponent {
  private readonly mockData = inject(MockDataService);

  readonly activeTab = signal<'friends' | 'requests'>('friends');
  readonly searchQuery = signal('');

  readonly friends = this.mockData.friends;
  readonly incomingRequests = this.mockData.incomingRequests;
  readonly outgoingRequests = this.mockData.outgoingRequests;
  readonly pendingCount = this.mockData.pendingRequestsCount;

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
    this.mockData.acceptFriendRequest(id);
  }
  declineRequest(id: string): void {
    this.mockData.declineFriendRequest(id);
  }
  cancelRequest(id: string): void {
    this.mockData.cancelFriendRequest(id);
  }
  removeFriend(userId: string): void {
    this.mockData.removeFriend(userId);
  }
  timeAgo(date: Date): string {
    return this.mockData.timeAgo(date);
  }

  trackFriend(_: number, f: Friend): string {
    return f.id;
  }
  trackRequest(_: number, r: FriendRequest): string {
    return r.id;
  }
}
