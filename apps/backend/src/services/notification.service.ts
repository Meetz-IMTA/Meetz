import prisma from "../lib/prisma.js";

export type NotificationType =
  | "comment"
  | "reply"
  | "thread_like"
  | "comment_like"
  | "friend_request"
  | "friend_accepted"
  | "event_join"
  | "event_leave"
  | "event_full";

interface NotificationInput {
  userId: number; // recipient
  actorId: number; // who triggered it
  type: NotificationType;
  threadId?: number;
  commentId?: number;
  eventId?: number;
}

/**
 * Fire-and-forget notification creation. Never throws into the caller so a
 * failed notification can't break the main action (comment, like, ...).
 */
export const notify = async (input: NotificationInput): Promise<void> => {
  if (input.userId === input.actorId) return; // no self-notifications
  try {
    // For friend actions: replace any existing notification of the same type
    // from the same actor so the inbox never shows duplicates.
    if (input.type === "friend_request" || input.type === "friend_accepted") {
      await prisma.notification.deleteMany({
        where: {
          userId: input.userId,
          actorId: input.actorId,
          type: input.type,
        },
      });
    }
    await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type,
        threadId: input.threadId ?? null,
        commentId: input.commentId ?? null,
        eventId: input.eventId ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

const actorSelect = { select: { id: true, name: true, avatarUrl: true } };

export const getNotifications = async (userId: number, limit = 20) => {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      include: {
        actor: actorSelect,
        thread: { select: { id: true, title: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { items, unreadCount };
};

export const getUnreadCount = async (userId: number) => {
  const unreadCount = await prisma.notification.count({
    where: { userId, read: false },
  });
  return { unreadCount };
};

export const markAllRead = async (userId: number) => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const markRead = async (id: number, userId: number) => {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
};

export const deleteAll = async (userId: number) => {
  await prisma.notification.deleteMany({ where: { userId } });
};
