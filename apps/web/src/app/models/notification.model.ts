export type NotificationType =
  | 'comment'
  | 'reply'
  | 'thread_like'
  | 'comment_like'
  | 'friend_request'
  | 'friend_accepted';

export interface AppNotification {
  id: number;
  userId: number;
  actorId: number | null;
  type: NotificationType;
  threadId: number | null;
  commentId: number | null;
  read: boolean;
  createdAt: string;
  actor: { id: number; name: string } | null;
  thread: { id: number; title: string } | null;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
