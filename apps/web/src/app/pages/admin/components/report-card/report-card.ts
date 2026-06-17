import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { UserModerationPanelComponent } from '../user-moderation-panel/user-moderation-panel';
import { ContentModerationPanelComponent } from '../content-moderation-panel/content-moderation-panel';
import { AdminService } from '../../../../services/admin';
import type { AdminReport, AdminUser, ContextMessage } from '../../../../shared/models/admin.model';

export interface ReportAction {
  type: 'ban' | 'unban' | 'deleteContent' | 'ignore' | 'resolve';
  reportId: number;
  payload?: unknown;
}

@Component({
  selector: 'app-report-card',
  imports: [
    NgClass,
    RouterLink,
    TimeAgoPipe,
    UserModerationPanelComponent,
    ContentModerationPanelComponent,
  ],
  templateUrl: './report-card.html',
})
export class ReportCardComponent {
  @Input({ required: true }) report!: AdminReport;
  @Output() action = new EventEmitter<ReportAction>();

  private adminService = inject(AdminService);

  showContext = signal(false);
  contextMessages = signal<ContextMessage[]>([]);
  contextLoading = signal(false);

  get reportedUser(): AdminUser | null {
    return (
      this.report.thread?.author ??
      this.report.comment?.author ??
      this.report.message?.sender ??
      null
    );
  }

  get contentLabel(): string {
    if (this.report.thread) return this.report.thread.title;
    if (this.report.comment) {
      const content = this.report.comment.content ?? '';
      return content.length > 80 ? content.slice(0, 80) + '…' : content || '[image]';
    }
    if (this.report.message) {
      const content = this.report.message.content ?? '';
      return content.length > 80 ? content.slice(0, 80) + '…' : content || '[fichier]';
    }
    return '—';
  }

  get contentThreadLink(): number | null {
    if (this.report.thread) return this.report.thread.id;
    if (this.report.comment) return this.report.comment.thread.id;
    return null;
  }

  readonly STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    reviewed: 'En cours',
    resolved: 'Résolu',
    ignored: 'Ignoré',
  };

  readonly STATUS_CLASSES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    ignored: 'bg-zinc-100 text-zinc-500',
  };

  toggleContext(): void {
    if (this.showContext()) {
      this.showContext.set(false);
      return;
    }
    if (this.contextMessages().length > 0) {
      this.showContext.set(true);
      return;
    }
    this.contextLoading.set(true);
    this.adminService.getMessageContext(this.report.messageId!).subscribe({
      next: (msgs) => {
        this.contextMessages.set(msgs);
        this.contextLoading.set(false);
        this.showContext.set(true);
      },
      error: () => this.contextLoading.set(false),
    });
  }

  onBanUser(event: { userId: number; reason?: string }) {
    this.action.emit({ type: 'ban', reportId: this.report.id, payload: event });
  }

  onUnbanUser(userId: number) {
    this.action.emit({ type: 'unban', reportId: this.report.id, payload: userId });
  }

  onDeleteContent(event: { type: 'thread' | 'comment' | 'message'; id: number }) {
    this.action.emit({ type: 'deleteContent', reportId: this.report.id, payload: event });
  }

  onIgnore(reportId: number) {
    this.action.emit({ type: 'ignore', reportId });
  }

  onResolve(reportId: number) {
    this.action.emit({ type: 'resolve', reportId });
  }
}
