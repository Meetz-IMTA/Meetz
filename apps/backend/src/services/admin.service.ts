import prisma from "../lib/prisma.js";
import { deleteImage } from "../lib/cloudinary.js";
import { decrypt, isEncrypted } from "./crypto.service.js";

const safeUserSelect = {
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isBanned: true,
    bannedAt: true,
    banReason: true,
  },
};

export const getAdminStats = async () => {
  const [totalReports, pendingReports, bannedUsers, totalUsers] =
    await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { isVerified: true } }),
    ]);
  return { totalReports, pendingReports, bannedUsers, totalUsers };
};

export interface ReportFilters {
  type?: "thread" | "comment" | "user" | "message" | "all";
  status?: "pending" | "reviewed" | "resolved" | "ignored" | "all";
  page?: number;
  limit?: number;
}

export const getReports = async (filters: ReportFilters = {}) => {
  const { type = "all", status = "all", page = 1, limit = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (status !== "all") where["status"] = status;
  if (type === "thread") where["threadId"] = { not: null };
  else if (type === "comment") where["commentId"] = { not: null };
  else if (type === "message") where["messageId"] = { not: null };
  else if (type === "user") where["reportedUserId"] = { not: null };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: safeUserSelect,
        thread: {
          select: {
            id: true,
            title: true,
            author: safeUserSelect,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: safeUserSelect,
            thread: { select: { id: true, title: true } },
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: safeUserSelect,
          },
        },
        reportedUser: { select: safeUserSelect.select },
      },
    }),
    prisma.report.count({ where }),
  ]);

  const decryptedReports = reports.map((r) => ({
    ...r,
    message: r.message
      ? {
          ...r.message,
          content: r.message.content
            ? isEncrypted(r.message.content)
              ? decrypt(r.message.content)
              : r.message.content
            : null,
        }
      : null,
  }));

  return {
    reports: decryptedReports,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateReportStatus = async (id: number, status: string) => {
  const valid = ["pending", "reviewed", "resolved", "ignored"];
  if (!valid.includes(status)) throw new Error("Statut invalide.");
  return prisma.report.update({ where: { id }, data: { status } });
};

export const banUserById = async (userId: number, reason?: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilisateur non trouvé.");
  return prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      banReason: reason?.trim() || null,
      refreshToken: null,
    },
    select: safeUserSelect.select,
  });
};

export const unbanUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilisateur non trouvé.");
  return prisma.user.update({
    where: { id: userId },
    data: { isBanned: false, bannedAt: null, banReason: null },
    select: safeUserSelect.select,
  });
};

export const pinThread = async (threadId: number, isPinned: boolean) => {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Thread non trouvé.");
  return prisma.thread.update({ where: { id: threadId }, data: { isPinned } });
};

export const adminDeleteThread = async (threadId: number) => {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Thread non trouvé.");
  const images = await prisma.threadImage.findMany({ where: { threadId } });
  await Promise.all(images.map((img) => deleteImage(img.imageUrl)));
  await prisma.thread.delete({ where: { id: threadId } });
};

export const getMessageContext = async (messageId: number) => {
  const reported = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      conversationId: true,
      sender: { select: { id: true, name: true } },
    },
  });
  if (!reported) throw new Error("Message non trouvé.");

  const [before, after] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: reported.conversationId, id: { lt: messageId } },
      orderBy: { id: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    }),
    prisma.message.findMany({
      where: { conversationId: reported.conversationId, id: { gt: messageId } },
      orderBy: { id: "asc" },
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    }),
  ]);

  const dec = (c: string | null) =>
    c ? (isEncrypted(c) ? decrypt(c) : c) : null;

  return [
    ...before
      .reverse()
      .map((m) => ({ ...m, content: dec(m.content), isReported: false })),
    { ...reported, content: dec(reported.content), isReported: true },
    ...after.map((m) => ({ ...m, content: dec(m.content), isReported: false })),
  ];
};

export const adminDeleteMessage = async (messageId: number) => {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message non trouvé.");
  await prisma.message.delete({ where: { id: messageId } });
};

export const adminDeleteComment = async (commentId: number) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { _count: { select: { replies: true } } },
  });
  if (!comment) throw new Error("Commentaire non trouvé.");
  if (comment._count.replies > 0) {
    await prisma.commentLike.deleteMany({ where: { commentId } });
    await prisma.comment.update({
      where: { id: commentId },
      data: { deleted: true, content: null, imageUrl: null },
    });
  } else {
    await prisma.comment.delete({ where: { id: commentId } });
  }
};

export interface AdminUserFilters {
  search?: string;
  banned?: boolean;
  page?: number;
  limit?: number;
}

export const getAdminUsers = async (filters: AdminUserFilters) => {
  const { search, banned, page = 1, limit = 20 } = filters;
  const where: Record<string, unknown> = { isVerified: true };
  if (search)
    where["OR"] = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  if (banned !== undefined) where["isBanned"] = banned;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "desc" },
      select: safeUserSelect.select,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, totalPages: Math.ceil(total / limit) };
};
