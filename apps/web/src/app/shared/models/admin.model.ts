export interface AdminStats {
  totalReports: number;
  pendingReports: number;
  bannedUsers: number;
  totalUsers: number;
}

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'ignored';
export type ReportType = 'thread' | 'comment' | 'message';

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
  messageId: number | null;
  reporter: AdminUser | null;
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
  message: {
    id: number;
    content: string | null;
    sender: AdminUser;
  } | null;
}

export interface ContextMessage {
  id: number;
  content: string | null;
  createdAt: string;
  sender: { id: number; name: string };
  isReported: boolean;
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
  type: 'all' | 'thread' | 'comment' | 'message';
  status: 'all' | ReportStatus;
  page: number;
}
