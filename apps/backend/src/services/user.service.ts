import prisma from "../lib/prisma.js";
import { v2 as cloudinary } from "cloudinary";

const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  bio: true,
  role: true,
  createdAt: true,
};

export const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          friendshipsA: true,
          friendshipsB: true,
          events: true,
        },
      },
    },
  });
  if (!user) throw new Error("Utilisateur introuvable.");

  const {
    password,
    refreshToken,
    otpCode,
    otpExpiry,
    resetToken,
    resetTokenExpiry,
    _count,
    ...safe
  } = user;
  return {
    ...safe,
    friendsCount: _count.friendshipsA + _count.friendshipsB,
    eventsCount: _count.events,
  };
};

export const updateMe = async (
  userId: number,
  data: { name?: string; bio?: string | null },
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  const {
    password,
    refreshToken,
    otpCode,
    otpExpiry,
    resetToken,
    resetTokenExpiry,
    ...safe
  } = user;
  return safe;
};

export const uploadAvatar = async (userId: number, buffer: Buffer) => {
  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "meetz/avatars",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      )
      .end(buffer);
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: result.secure_url },
  });

  return { avatarUrl: result.secure_url as string };
};

export const getUserById = async (currentUserId: number, targetId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: targetId, isVerified: true },
    include: {
      _count: {
        select: { friendshipsA: true, friendshipsB: true, events: true },
      },
    },
  });
  if (!user) return null;

  const {
    password,
    refreshToken,
    otpCode,
    otpExpiry,
    resetToken,
    resetTokenExpiry,
    _count,
    ...safe
  } = user;
  return {
    ...safe,
    friendsCount: _count.friendshipsA + _count.friendshipsB,
    eventsCount: _count.events,
  };
};

export const searchUsers = async (currentUserId: number, query: string) => {
  if (query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      isVerified: true,
      OR: [{ name: { contains: query } }, { email: { contains: query } }],
    },
    select: { ...PUBLIC_SELECT },
    take: 20,
  });

  const [friendships, requests] = await Promise.all([
    prisma.friendship.findMany({
      where: { OR: [{ userAId: currentUserId }, { userBId: currentUserId }] },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
    }),
  ]);

  const friendIds = new Set(
    friendships.map((f) =>
      f.userAId === currentUserId ? f.userBId : f.userAId,
    ),
  );

  return users.map((user) => {
    if (friendIds.has(user.id))
      return { user, relation: "friend", requestId: undefined };

    const req = requests.find(
      (r) =>
        (r.senderId === currentUserId && r.receiverId === user.id) ||
        (r.receiverId === currentUserId && r.senderId === user.id),
    );

    if (req) {
      return {
        user,
        relation:
          req.senderId === currentUserId ? "request_sent" : "request_received",
        requestId: req.id,
      };
    }

    return { user, relation: "none", requestId: undefined };
  });
};

export const reportUser = async (
  reporterId: number,
  reportedUserId: number,
  reason: string,
  details?: string | null,
) => {
  const target = await prisma.user.findUnique({
    where: { id: reportedUserId },
  });
  if (!target) throw new Error("Utilisateur introuvable.");
  if (reporterId === reportedUserId)
    throw new Error("Vous ne pouvez pas vous signaler vous-même.");

  return prisma.report.create({
    data: {
      reporterId,
      reportedUserId,
      reason: [reason, details].filter(Boolean).join(" — ") || null,
    },
  });
};

export const uploadBanner = async (userId: number, buffer: Buffer) => {
  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "meetz/banners",
          resource_type: "image",
          transformation: [{ width: 1200, height: 300, crop: "fill" }],
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      )
      .end(buffer);
  });

  await prisma.user.update({
    where: { id: userId },
    data: { bannerUrl: result.secure_url },
  });

  return { bannerUrl: result.secure_url as string };
};
