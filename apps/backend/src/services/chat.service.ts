import prisma from "../lib/prisma.js";

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
  return prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: content || null,
      imageUrl: imageUrl ?? null,
      gifUrl: gifUrl ?? null,
    },
    include: {
      sender: { select: { id: true, name: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
  });
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
            include: { user: { select: { id: true, name: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
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
      const lastMessage = conversation.messages[0] ?? null;
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
  return prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
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
      participants: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
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
      participants: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
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
    select: { id: true, name: true, email: true },
  });
};
