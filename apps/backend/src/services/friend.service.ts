import prisma from "../lib/prisma.js";
import { notify } from "./notification.service.js";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
};

export const getFriends = async (userId: number) => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: USER_SELECT },
      userB: { select: USER_SELECT },
    },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map((f) => ({
    id: f.id,
    user: f.userAId === userId ? f.userB : f.userA,
    since: f.createdAt,
  }));
};

export const getRequests = async (userId: number) => {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: { sender: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: { receiver: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      from: r.sender,
      sentAt: r.createdAt,
      direction: "incoming",
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id,
      to: r.receiver,
      sentAt: r.createdAt,
      direction: "outgoing",
    })),
  };
};

export const sendRequest = async (senderId: number, receiverId: number) => {
  if (senderId === receiverId) {
    throw new Error("Vous ne pouvez pas vous ajouter vous-même.");
  }

  const alreadyFriends = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: senderId, userBId: receiverId },
        { userAId: receiverId, userBId: senderId },
      ],
    },
  });
  if (alreadyFriends) throw new Error("Vous êtes déjà amis.");

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId, status: "PENDING" },
        { senderId: receiverId, receiverId: senderId, status: "PENDING" },
      ],
    },
  });
  if (existingRequest) throw new Error("Une demande est déjà en attente.");

  const request = await prisma.friendRequest.create({
    data: { senderId, receiverId },
  });
  notify({ userId: receiverId, actorId: senderId, type: "friend_request" });
  return request;
};

export const acceptRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.receiverId !== userId)
    throw new Error("Demande introuvable.");
  if (request.status !== "PENDING")
    throw new Error("Cette demande n'est plus en attente.");

  await prisma.$transaction([
    prisma.friendRequest.delete({ where: { id: requestId } }),
    prisma.friendship.create({
      data: { userAId: request.senderId, userBId: request.receiverId },
    }),
  ]);
  notify({
    userId: request.senderId,
    actorId: userId,
    type: "friend_accepted",
  });
};

export const declineRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.receiverId !== userId)
    throw new Error("Demande introuvable.");

  await prisma.friendRequest.delete({ where: { id: requestId } });
};

export const cancelRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.senderId !== userId)
    throw new Error("Demande introuvable.");

  await prisma.friendRequest.delete({ where: { id: requestId } });
};

export const removeFriend = async (userId: number, friendId: number) => {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userAId: userId, userBId: friendId },
        { userAId: friendId, userBId: userId },
      ],
    },
  });
};
