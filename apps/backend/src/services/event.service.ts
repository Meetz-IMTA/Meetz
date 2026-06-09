import prisma from "../lib/prisma.js";

interface EventData {
  name: string;
  description?: string;
  date: string;
  location?: string;
  category?: string;
  maxAttendees?: number;
  imageUrl?: string;
}

export interface EventFilters {
  category?: string;
  search?: string;
  organizerId?: number;
}

export const getEvents = (filters: EventFilters = {}) =>
  prisma.event.findMany({
    where: {
      ...(filters.category && { category: filters.category }),
      ...(filters.organizerId !== undefined && {
        organizerId: filters.organizerId,
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { description: { contains: filters.search } },
          { location: { contains: filters.search } },
        ],
      }),
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { date: "asc" },
  });

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
