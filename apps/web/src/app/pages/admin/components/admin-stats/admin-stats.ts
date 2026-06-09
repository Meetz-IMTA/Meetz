import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AdminStats } from '../../../../shared/models/admin.model';

@Component({
  selector: 'app-admin-stats',
  imports: [CommonModule],
  templateUrl: './admin-stats.html',
})
export class AdminStatsComponent {
  @Input() stats: AdminStats | null = null;
  @Input() loading = false;
}
