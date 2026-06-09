import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { AdminReport } from '../../../../shared/models/admin.model';

@Component({
  selector: 'app-content-moderation-panel',
  templateUrl: './content-moderation-panel.html',
})
export class ContentModerationPanelComponent {
  @Input({ required: true }) report!: AdminReport;
  @Output() deleteContent = new EventEmitter<{ type: 'thread' | 'comment'; id: number }>();
  @Output() ignoreReport = new EventEmitter<number>();
  @Output() resolveReport = new EventEmitter<number>();

  get isThread(): boolean {
    return this.report.threadId != null;
  }

  get contentId(): number {
    return (this.report.threadId ?? this.report.commentId)!;
  }

  onDelete() {
    const type = this.isThread ? 'thread' : 'comment';
    const label = this.isThread ? 'ce post' : 'ce commentaire';
    if (confirm(`Supprimer définitivement ${label} ?`)) {
      this.deleteContent.emit({ type, id: this.contentId });
    }
  }

  onIgnore() {
    this.ignoreReport.emit(this.report.id);
  }

  onResolve() {
    this.resolveReport.emit(this.report.id);
  }
}
