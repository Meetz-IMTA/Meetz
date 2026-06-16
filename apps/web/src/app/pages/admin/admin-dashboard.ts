import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../services/admin';
import { AdminStatsComponent } from './components/admin-stats/admin-stats';
import { AdminFiltersComponent } from './components/admin-filters/admin-filters';
import { ReportsTableComponent } from './components/reports-table/reports-table';
import type {
  AdminStats,
  AdminReport,
  AdminUser,
  ReportFilters,
  AdminUsersResponse,
} from '../../shared/models/admin.model';
import type { ReportAction } from './components/report-card/report-card';
import { UserModerationPanelComponent } from './components/user-moderation-panel/user-moderation-panel';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AdminStatsComponent,
    AdminFiltersComponent,
    ReportsTableComponent,
    UserModerationPanelComponent,
    TimeAgoPipe,
  ],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit {
  private adminService = inject(AdminService);

  stats = signal<AdminStats | null>(null);
  statsLoading = signal(true);

  reports = signal<AdminReport[]>([]);
  reportsLoading = signal(true);
  reportsError = signal('');
  totalPages = signal(1);
  currentPage = signal(1);

  activeTab = signal<'reports' | 'users'>('reports');

  users = signal<AdminUser[]>([]);
  usersLoading = signal(false);
  usersError = signal('');
  usersTotalPages = signal(1);
  usersPage = signal(1);
  usersSearch = signal('');
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private readonly usersPageSize = 10;

  private filters: ReportFilters = { type: 'all', status: 'all', page: 1 };

  ngOnInit() {
    this.loadStats();
    this.loadReports();
  }

  private loadStats() {
    this.statsLoading.set(true);
    this.adminService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.statsLoading.set(false);
      },
      error: () => this.statsLoading.set(false),
    });
  }

  loadReports() {
    this.reportsLoading.set(true);
    this.reportsError.set('');
    this.adminService
      .getReports({
        type: this.filters.type !== 'all' ? this.filters.type : undefined,
        status: this.filters.status !== 'all' ? this.filters.status : undefined,
        page: this.filters.page,
        limit: 10,
      })
      .subscribe({
        next: (res) => {
          this.reports.set(res.reports);
          this.totalPages.set(res.totalPages);
          this.currentPage.set(res.page);
          this.reportsLoading.set(false);
        },
        error: () => {
          this.reportsError.set('Impossible de charger les signalements.');
          this.reportsLoading.set(false);
        },
      });
  }

  onFilterChange(f: ReportFilters) {
    this.filters = f;
    this.loadReports();
  }

  onPageChange(page: number) {
    this.filters = { ...this.filters, page };
    this.loadReports();
  }

  onReportAction(action: ReportAction) {
    switch (action.type) {
      case 'ban': {
        const p = action.payload as { userId: number; reason?: string };
        this.adminService.banUser(p.userId, p.reason).subscribe({
          next: () => this.refresh(),
          error: () => alert('Erreur lors du bannissement.'),
        });
        break;
      }
      case 'unban': {
        this.adminService.unbanUser(action.payload as number).subscribe({
          next: () => this.refresh(),
          error: () => alert('Erreur lors du débannissement.'),
        });
        break;
      }
      case 'deleteContent': {
        const p = action.payload as { type: 'thread' | 'comment'; id: number };
        const req =
          p.type === 'thread'
            ? this.adminService.deleteThread(p.id)
            : this.adminService.deleteComment(p.id);
        req.subscribe({
          next: () => {
            this.adminService
              .updateReportStatus(action.reportId, 'resolved')
              .subscribe({ next: () => this.refresh() });
          },
          error: () => alert('Erreur lors de la suppression.'),
        });
        break;
      }
      case 'ignore': {
        this.adminService
          .updateReportStatus(action.reportId, 'ignored')
          .subscribe({ next: () => this.refresh() });
        break;
      }
      case 'resolve': {
        this.adminService
          .updateReportStatus(action.reportId, 'resolved')
          .subscribe({ next: () => this.refresh() });
        break;
      }
    }
  }

  private refresh() {
    this.loadStats();
    this.loadReports();
    if (this.activeTab() === 'users') this.loadUsers();
  }

  switchTab(tab: 'reports' | 'users') {
    this.activeTab.set(tab);
    if (tab === 'users' && this.users().length === 0) this.loadUsers();
  }

  loadUsers() {
    this.usersLoading.set(true);
    this.usersError.set('');
    this.adminService
      .getUsers({
        page: this.usersPage(),
        limit: this.usersPageSize,
        search: this.usersSearch().trim() || undefined,
      })
      .subscribe({
        next: (res: AdminUsersResponse) => {
          this.users.set(res.users);
          this.usersTotalPages.set(res.totalPages);
          this.usersLoading.set(false);
        },
        error: () => {
          this.usersError.set('Impossible de charger les utilisateurs.');
          this.usersLoading.set(false);
        },
      });
  }

  onUsersPageChange(page: number) {
    this.usersPage.set(page);
    this.loadUsers();
  }

  onUsersSearchInput(value: string) {
    this.usersSearch.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.usersPage.set(1);
      this.loadUsers();
    }, 300);
  }

  onBanFromUsersTab(event: { userId: number; reason?: string }) {
    this.adminService.banUser(event.userId, event.reason).subscribe({
      next: () => this.refresh(),
      error: () => alert('Erreur lors du bannissement.'),
    });
  }

  onUnbanFromUsersTab(userId: number) {
    this.adminService.unbanUser(userId).subscribe({
      next: () => this.refresh(),
      error: () => alert('Erreur lors du débannissement.'),
    });
  }
}
