import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReportCardComponent, ReportAction } from '../report-card/report-card';
import type { AdminReport } from '../../../../shared/models/admin.model';

@Component({
  selector: 'app-reports-table',
  imports: [ReportCardComponent],
  templateUrl: './reports-table.html',
})
export class ReportsTableComponent {
  @Input() reports: AdminReport[] = [];
  @Input() loading = false;
  @Input() totalPages = 1;
  @Input() currentPage = 1;
  @Output() actionDone = new EventEmitter<ReportAction>();
  @Output() pageChange = new EventEmitter<number>();

  readonly skeletons = Array.from({ length: 5 });

  onAction(event: ReportAction) {
    this.actionDone.emit(event);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }
}
