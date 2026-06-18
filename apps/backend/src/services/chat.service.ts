import prisma from "../lib/prisma.js";
import { encrypt, decrypt, isEncrypted } from "./crypto.service.js";

export const isParticipant = async (
  conversationId: number,
  userId: number,
): Promise<boolean> => {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return p !== null;
};

export const saveMessage = async (
  conversationId: number,
  senderId: number,
  content: string,
  imageUrl?: string,
  gifUrl?: string,
) => {
  const encryptedContent = content ? encrypt(content) : null;
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: encryptedContent,
      imageUrl: imageUrl ?? null,
      gifUrl: gifUrl ?? null,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
  });
  return {
    ...message,
    content: message.content ? content : null,
  };
};

export const markAsRead = async (conversationId: number, userId: number) => {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
};

export const getUserConversations = async (userId: number) => {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          event: { select: { id: true, name: true } },
        },
      },
    },
  });

  const results = await Promise.all(
    participations.map(async ({ conversation, lastReadAt }) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: userId },
        },
      });
      const rawLastMessage = conversation.messages[0] ?? null;
      const lastMessage = rawLastMessage
        ? {
            ...rawLastMessage,
            content: rawLastMessage.content
              ? isEncrypted(rawLastMessage.content)
                ? decrypt(rawLastMessage.content)
                : rawLastMessage.content
              : null,
          }
        : null;
      return { ...conversation, lastMessage, unreadCount };
    }),
  );

  return results.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? a.createdAt;
    const bTime = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
};

export const getConversationMessages = async (
  conversationId: number,
  userId: number,
  page: number,
  limit: number,
) => {
  if (!(await isParticipant(conversationId, userId))) {
    throw new Error("Non autorisé");
  }
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return messages.map((msg) => ({
    ...msg,
    content: msg.content
      ? isEncrypted(msg.content)
        ? decrypt(msg.content)
        : msg.content
      : null,
  }));
};

export const toggleReaction = async (
  messageId: number,
  userId: number,
  emoji: string,
) => {
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return { action: "removed" as const, emoji };
  }
  await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
  return { action: "added" as const, emoji };
};

export const reportMessage = async (
  messageId: number,
  reporterId: number,
  reason?: string,
) => {
  return prisma.report.create({
    data: { messageId, reporterId, reason: reason ?? null },
  });
};

export const findOrCreatePrivateConversation = async (
  userId: number,
  targetUserId: number,
) => {
  const existing = await prisma.conversation.findFirst({
    where: {
      type: "PRIVATE",
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      type: "PRIVATE",
      participants: { create: [{ userId }, { userId: targetUserId }] },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
};

export const createEventGroupConversation = async (
  eventId: number,
  organizerId: number,
  eventName: string,
) => {
  return prisma.conversation.create({
    data: {
      type: "EVENT_GROUP",
      name: eventName,
      eventId,
      participants: { create: [{ userId: organizerId }] },
    },
  });
};

export const getUsers = async (excludeUserId: number) => {
  return prisma.user.findMany({
    where: { id: { not: excludeUserId }, isVerified: true },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
};
