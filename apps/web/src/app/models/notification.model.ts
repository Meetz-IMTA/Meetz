export type NotificationType =
  | 'comment'
  | 'reply'
  | 'thread_like'
  | 'comment_like'
  | 'friend_request'
  | 'friend_accepted'
  | 'event_join'
  | 'event_leave'
  | 'event_full'
  | 'cooptation';

export interface AppNotification {
  id: number;
  userId: number;
  actorId: number | null;
  type: NotificationType;
  threadId: number | null;
  commentId: number | null;
  eventId: number | null;
  read: boolean;
  createdAt: string;
  actor: { id: number; name: string; avatarUrl: string | null } | null;
  thread: { id: number; title: string } | null;
  event: { id: number; name: string } | null;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
