import prisma from "../lib/prisma.js";

interface EventData {
  name: string;
  description?: string;
  date: string;
  location?: string;
  category?: string;
  maxAttendees?: number;
  imageUrl?: string;
  isPrivate?: boolean | string;
}

export interface EventFilters {
  category?: string;
  search?: string;
  organizerId?: number;
  privateOnly?: boolean;
  viewerId?: number;
}

// Multipart form fields arrive as strings ("true"/"false"), JSON as booleans.
const toBool = (value: boolean | string | undefined): boolean =>
  value === true || value === "true";

const getFriendIds = async (userId: number): Promise<number[]> => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
};

// Un événement privé n'est visible que par son organisateur et les amis de celui-ci.
const visibilityWhere = async (viewerId?: number) => {
  if (viewerId == null) return { isPrivate: false };
  const friendIds = await getFriendIds(viewerId);
  return {
    OR: [
      { isPrivate: false },
      { organizerId: viewerId },
      { organizerId: { in: friendIds } },
    ],
  };
};

export const getEvents = async (filters: EventFilters = {}) =>
  prisma.event.findMany({
    where: {
      AND: [
        await visibilityWhere(filters.viewerId),
        {
          ...(filters.category && { category: filters.category }),
          ...(filters.organizerId !== undefined && {
            organizerId: filters.organizerId,
          }),
          ...(filters.privateOnly && { isPrivate: true }),
          ...(filters.search && {
            OR: [
              { name: { contains: filters.search } },
              { description: { contains: filters.search } },
              { location: { contains: filters.search } },
            ],
          }),
        },
      ],
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { date: "asc" },
  });

export const getFeaturedEvents = async () => {
  const events = await prisma.event.findMany({
    where: { isPrivate: false, date: { gte: new Date() } },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      _count: { select: { participations: true } },
    },
    orderBy: { participations: { _count: "desc" } },
    take: 3,
  });
  return events.map(({ _count, ...e }) => ({
    ...e,
    participantCount: _count.participations,
  }));
};

export const getEventById = async (id: number, userId?: number) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      _count: { select: { participations: true } },
    },
  });
  if (!event) throw new Error("Événement non trouvé.");

  // Événement privé : réservé à l'organisateur et à ses amis.
  // On renvoie la même erreur qu'un événement inexistant pour ne rien divulguer.
  if (event.isPrivate && event.organizerId !== userId) {
    const isFriend =
      userId != null &&
      (await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: event.organizerId },
            { userAId: event.organizerId, userBId: userId },
          ],
        },
      })) != null;
    if (!isFriend) throw new Error("Événement non trouvé.");
  }

  const { _count, ...rest } = event;

  let isJoined = false;
  if (userId != null) {
    const participation = await prisma.eventParticipation.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
    });
    isJoined = participation != null;
  }

  return { ...rest, participantCount: _count.participations, isJoined };
};

export const createEvent = (data: EventData, organizerId: number) =>
  prisma.event.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      date: new Date(data.date),
      location: data.location ?? null,
      category: data.category ?? null,
      maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : null,
      imageUrl: data.imageUrl ?? null,
      isPrivate: toBool(data.isPrivate),
      organizerId,
    },
  });

export const updateEvent = async (
  id: number,
  data: Partial<EventData>,
  userId: number,
) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId)
    throw new Error("Non autorisé à modifier cet événement.");

  return prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.maxAttendees !== undefined && {
        maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : null,
      }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.isPrivate !== undefined && {
        isPrivate: toBool(data.isPrivate),
      }),
    },
  });
};

export const deleteEvent = async (id: number, userId: number) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId)
    throw new Error("Non autorisé à supprimer cet événement.");
  await prisma.event.delete({ where: { id } });
};
