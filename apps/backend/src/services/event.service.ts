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

export const getEvents = () =>
  prisma.event.findMany({
    include: { organizer: { select: { id: true, name: true, email: true } } },
  });

export const getEventById = async (id: number) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { organizer: { select: { id: true, name: true, email: true } } },
  });
  if (!event) throw new Error("Événement non trouvé.");
  return event;
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

export const updateEvent = async (id: number, data: Partial<EventData>, userId: number) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId) throw new Error("Non autorisé à modifier cet événement.");

  return prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.maxAttendees !== undefined && { maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : null }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
    },
  });
};

export const deleteEvent = async (id: number, userId: number) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId) throw new Error("Non autorisé à supprimer cet événement.");
  await prisma.event.delete({ where: { id } });
};
