import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AdminUser } from '../../../../shared/models/admin.model';

@Component({
  selector: 'app-user-moderation-panel',
  imports: [RouterLink],
  templateUrl: './user-moderation-panel.html',
})
export class UserModerationPanelComponent {
  @Input({ required: true }) user!: AdminUser;
  @Output() banUser = new EventEmitter<{ userId: number; reason?: string }>();
  @Output() unbanUser = new EventEmitter<number>();

  banReason = signal('');
  showBanForm = signal(false);

  toggleBanForm() {
    this.showBanForm.update((v) => !v);
    this.banReason.set('');
  }

  submitBan() {
    this.banUser.emit({ userId: this.user.id, reason: this.banReason() || undefined });
    this.showBanForm.set(false);
    this.banReason.set('');
  }

  submitUnban() {
    this.unbanUser.emit(this.user.id);
  }
}
