import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { RoleBadgeComponent } from '../../shared/components/role-badge/role-badge.component';
import type { UserSearchResult } from '../../shared/models';

@Component({
  selector: 'app-friend-search',
  standalone: true,
  imports: [RouterLink, AvatarComponent, StarRatingComponent, RoleBadgeComponent],
  templateUrl: './friend-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendSearchComponent {
  private readonly mockData = inject(MockDataService);

  readonly searchQuery = signal('');
  readonly hasQuery = computed(() => this.searchQuery().trim().length >= 2);
  readonly results = computed(() => this.mockData.searchUsers(this.searchQuery()));

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }
  sendRequest(userId: string): void {
    this.mockData.sendFriendRequest(userId);
  }
  cancelRequest(requestId: string): void {
    this.mockData.cancelFriendRequest(requestId);
  }
  trackResult(_: number, r: UserSearchResult): string {
    return r.user.id;
  }
}
