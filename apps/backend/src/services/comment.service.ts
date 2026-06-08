import prisma from "../lib/prisma.js";
import { notify } from "./notification.service.js";
import { deleteImage } from "../lib/cloudinary.js";

const authorSelect = { select: { id: true, name: true, email: true } };

interface CommentData {
  content?: string;
  imageUrl?: string;
  parentCommentId?: number;
}

export const createComment = async (
  threadId: number,
  data: CommentData,
  authorId: number,
) => {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Thread non trouvé.");

  if (!data.content?.trim() && !data.imageUrl)
    throw new Error("Le commentaire doit contenir du texte ou une image.");

  let parent = null;
  if (data.parentCommentId != null) {
    parent = await prisma.comment.findUnique({
      where: { id: data.parentCommentId },
    });
    if (!parent || parent.threadId !== threadId)
      throw new Error("Commentaire parent invalide.");
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content?.trim() || null,
      imageUrl: data.imageUrl ?? null,
      threadId,
      authorId,
      parentCommentId: data.parentCommentId ?? null,
    },
    include: { author: authorSelect },
  });

  // Notify the parent comment's author (reply) or the thread author (comment)
  if (parent) {
    await notify({
      userId: parent.authorId,
      actorId: authorId,
      type: "reply",
      threadId,
      commentId: comment.id,
    });
  } else {
    await notify({
      userId: thread.authorId,
      actorId: authorId,
      type: "comment",
      threadId,
      commentId: comment.id,
    });
  }

  return { ...comment, likesCount: 0, isLiked: false };
};

export const deleteComment = async (id: number, userId: number) => {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { _count: { select: { replies: true } } },
  });
  if (!comment) throw new Error("Commentaire non trouvé.");
  if (comment.authorId !== userId)
    throw new Error("Non autorisé à supprimer ce commentaire.");

  // Twitter/Reddit style: if the comment has replies, keep it as a tombstone
  // so the thread of replies survives; otherwise remove it entirely.
  if (comment._count.replies > 0) {
    await prisma.commentLike.deleteMany({ where: { commentId: id } });
    await prisma.comment.update({
      where: { id },
      data: { deleted: true, content: null, imageUrl: null },
    });
  } else {
    await prisma.comment.delete({ where: { id } });
  }

  // Purge the comment's own Cloudinary image (skips external GIF URLs)
  await deleteImage(comment.imageUrl);
};

export const toggleCommentLike = async (commentId: number, userId: number) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Commentaire non trouvé.");

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({ data: { userId, commentId } });
    await notify({
      userId: comment.authorId,
      actorId: userId,
      type: "comment_like",
      threadId: comment.threadId,
      commentId,
    });
  }

  const likesCount = await prisma.commentLike.count({ where: { commentId } });
  return { liked: !existing, likesCount };
};

export const reportThread = async (
  threadId: number,
  userId: number,
  reason?: string,
) => {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Thread non trouvé.");

  return prisma.report.create({
    data: {
      threadId,
      reporterId: userId,
      reason: reason?.trim() || null,
    },
  });
};

export const reportComment = async (
  commentId: number,
  userId: number,
  reason?: string,
) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Commentaire non trouvé.");

  return prisma.report.create({
    data: {
      commentId,
      reporterId: userId,
      reason: reason?.trim() || null,
    },
  });
};
