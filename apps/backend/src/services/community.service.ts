import prisma from "../lib/prisma.js";
import { notify } from "./notification.service.js";
import { deleteImages } from "../lib/cloudinary.js";

const authorSelect = {
  select: { id: true, name: true, email: true, avatarUrl: true },
};

// ── Categories ────────────────────────────────────────────────────────────

export const getCategories = () =>
  prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { threads: true } } },
  });

export const getCategoryById = async (id: number) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { threads: true } } },
  });
  if (!category) throw new Error("Catégorie non trouvée.");
  return category;
};

interface CategoryData {
  name: string;
  description?: string;
  icon?: string;
}

export const createCategory = (data: CategoryData) =>
  prisma.category.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? null,
    },
  });

// ── Threads ───────────────────────────────────────────────────────────────

export interface ThreadFilters {
  categoryId?: number;
  search?: string;
  authorId?: number;
  sort?: "recent" | "popular";
  page?: number;
  limit?: number;
}

const threadListInclude = {
  author: authorSelect,
  category: { select: { id: true, name: true, icon: true } },
  images: { select: { id: true, imageUrl: true } },
  _count: { select: { comments: true, likes: true } },
};

const mapThreadCounts = <
  T extends { _count: { comments: number; likes: number } },
>(
  thread: T,
) => {
  const { _count, ...rest } = thread;
  return { ...rest, commentsCount: _count.comments, likesCount: _count.likes };
};

export const getThreads = async (filters: ThreadFilters = {}) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.categoryId !== undefined && { categoryId: filters.categoryId }),
    ...(filters.authorId !== undefined && { authorId: filters.authorId }),
    ...(filters.search && {
      OR: [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
      ],
    }),
  };

  const orderBy =
    filters.sort === "popular"
      ? [{ isPinned: "desc" as const }, { likes: { _count: "desc" as const } }]
      : [{ isPinned: "desc" as const }, { createdAt: "desc" as const }];

  const [total, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      include: threadListInclude,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  return {
    items: threads.map(mapThreadCounts),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const getThreadById = async (id: number, userId?: number) => {
  const thread = await prisma.thread
    .update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: {
        ...threadListInclude,
        comments: {
          include: {
            author: authorSelect,
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    .catch(() => null);

  if (!thread) throw new Error("Thread non trouvé.");

  // Per-user like state for the thread and its comments
  let isLiked = false;
  const likedCommentIds = new Set<number>();
  if (userId != null) {
    const [threadLike, commentLikes] = await Promise.all([
      prisma.threadLike.findUnique({
        where: { userId_threadId: { userId, threadId: id } },
      }),
      prisma.commentLike.findMany({
        where: { userId, comment: { threadId: id } },
        select: { commentId: true },
      }),
    ]);
    isLiked = threadLike != null;
    commentLikes.forEach((l) => likedCommentIds.add(l.commentId));
  }

  const comments = thread.comments.map(({ _count, ...comment }) => ({
    ...comment,
    likesCount: _count.likes,
    isLiked: likedCommentIds.has(comment.id),
  }));

  return { ...mapThreadCounts(thread), comments, isLiked };
};

interface ThreadData {
  title: string;
  content: string;
  categoryId: number;
  imageUrls?: string[];
  removedImageIds?: number[];
}

export const createThread = async (data: ThreadData, authorId: number) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) throw new Error("Catégorie invalide.");

  return prisma.thread.create({
    data: {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      authorId,
      ...(data.imageUrls?.length && {
        images: { create: data.imageUrls.map((imageUrl) => ({ imageUrl })) },
      }),
    },
    include: threadListInclude,
  });
};

export const updateThread = async (
  id: number,
  data: Partial<ThreadData>,
  userId: number,
) => {
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: { images: { select: { id: true, imageUrl: true } } },
  });
  if (!thread) throw new Error("Thread non trouvé.");
  if (thread.authorId !== userId)
    throw new Error("Non autorisé à modifier ce thread.");

  // Remove selected existing images (rows now, Cloudinary after the update)
  let urlsToPurge: string[] = [];
  if (data.removedImageIds?.length) {
    const toRemove = thread.images.filter((i) =>
      data.removedImageIds!.includes(i.id),
    );
    urlsToPurge = toRemove.map((i) => i.imageUrl);
    if (toRemove.length) {
      await prisma.threadImage.deleteMany({
        where: { id: { in: toRemove.map((i) => i.id) }, threadId: id },
      });
    }
  }

  const updated = await prisma.thread.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.imageUrls?.length && {
        images: { create: data.imageUrls.map((imageUrl) => ({ imageUrl })) },
      }),
    },
    include: threadListInclude,
  });

  if (urlsToPurge.length) await deleteImages(urlsToPurge);
  return updated;
};

export const deleteThread = async (id: number, userId: number) => {
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      images: { select: { imageUrl: true } },
      comments: { select: { imageUrl: true } },
    },
  });
  if (!thread) throw new Error("Thread non trouvé.");
  if (thread.authorId !== userId)
    throw new Error("Non autorisé à supprimer ce thread.");

  // Collect every Cloudinary asset attached to the thread or its comments
  const imageUrls = [
    ...thread.images.map((i) => i.imageUrl),
    ...thread.comments.map((c) => c.imageUrl),
  ];

  await prisma.thread.delete({ where: { id } }); // cascade-removes DB rows
  await deleteImages(imageUrls); // purge Cloudinary (skips external GIFs)
};

// ── Likes ─────────────────────────────────────────────────────────────────

export const toggleLike = async (threadId: number, userId: number) => {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) throw new Error("Thread non trouvé.");

  const existing = await prisma.threadLike.findUnique({
    where: { userId_threadId: { userId, threadId } },
  });

  if (existing) {
    await prisma.threadLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.threadLike.create({ data: { userId, threadId } });
    await notify({
      userId: thread.authorId,
      actorId: userId,
      type: "thread_like",
      threadId,
    });
  }

  const likesCount = await prisma.threadLike.count({ where: { threadId } });
  return { liked: !existing, likesCount };
};
