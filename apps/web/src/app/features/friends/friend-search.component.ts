import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, switchMap } from 'rxjs';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { RoleBadgeComponent } from '../../shared/components/role-badge/role-badge.component';

@Component({
  selector: 'app-friend-search',
  standalone: true,
  imports: [RouterLink, AvatarComponent, StarRatingComponent, RoleBadgeComponent],
  templateUrl: './friend-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendSearchComponent {
  private readonly friendService = inject(FriendService);
  private readonly userService = inject(UserService);

  readonly searchQuery = signal('');

  readonly results = toSignal(
    toObservable(this.searchQuery).pipe(
      debounceTime(300),
      switchMap((q) => this.userService.searchUsers(q)),
    ),
    { initialValue: [] as any[] },
  );

  readonly hasQuery = toSignal(toObservable(this.searchQuery).pipe(debounceTime(300)), {
    initialValue: '',
  });

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  get hasQueryValue(): boolean {
    return this.searchQuery().trim().length >= 2;
  }

  sendRequest(userId: string): void {
    this.friendService.sendFriendRequest(userId);
  }
  cancelRequest(requestId: string): void {
    this.friendService.cancelFriendRequest(requestId);
  }
  trackResult(_: number, r: any): string {
    return r.user.id;
  }
}
