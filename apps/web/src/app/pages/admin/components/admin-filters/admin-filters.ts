import { Component, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ReportFilters } from '../../../../shared/models/admin.model';

@Component({
  selector: 'app-admin-filters',
  imports: [FormsModule],
  templateUrl: './admin-filters.html',
})
export class AdminFiltersComponent {
  @Output() filterChange = new EventEmitter<ReportFilters>();

  type = signal<ReportFilters['type']>('all');
  status = signal<ReportFilters['status']>('all');

  readonly typeOptions: { label: string; value: ReportFilters['type'] }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Posts', value: 'thread' },
    { label: 'Commentaires', value: 'comment' },
    { label: 'Utilisateurs', value: 'user' },
  ];

  readonly statusOptions: { label: string; value: ReportFilters['status'] }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'En attente', value: 'pending' },
    { label: 'En cours', value: 'reviewed' },
    { label: 'Résolu', value: 'resolved' },
    { label: 'Ignoré', value: 'ignored' },
  ];

  setType(value: ReportFilters['type']) {
    this.type.set(value);
    this.emit();
  }

  setStatus(value: ReportFilters['status']) {
    this.status.set(value);
    this.emit();
  }

  private emit() {
    this.filterChange.emit({ type: this.type(), status: this.status(), page: 1 });
  }
}
