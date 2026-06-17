export interface AdminStats {
  totalReports: number;
  pendingReports: number;
  bannedUsers: number;
  totalUsers: number;
}

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'ignored';
export type ReportType = 'thread' | 'comment' | 'user';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
}

export interface AdminReport {
  id: number;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  threadId: number | null;
  commentId: number | null;
  reporter: { id: number; name: string; email: string } | null;
  thread: {
    id: number;
    title: string;
    author: AdminUser;
  } | null;
  comment: {
    id: number;
    content: string | null;
    author: AdminUser;
    thread: { id: number; title: string };
  } | null;
  reportedUser: AdminUser | null;
}

export interface AdminReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReportFilters {
  type: 'all' | 'thread' | 'comment' | 'user';
  status: 'all' | ReportStatus;
  page: number;
}
