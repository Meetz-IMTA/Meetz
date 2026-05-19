import prisma from "../lib/prisma.js";

export const getEvents = async () => {
  return prisma.event.findMany({
    include: { organizer: { select: { id: true, name: true, email: true } } },
  });
};

export const getEventById = async (id: number) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { organizer: { select: { id: true, name: true, email: true } } },
  });
  if (!event) throw new Error("Événement non trouvé.");
  return event;
};

export const createEvent = async (
  data: {
    name: string;
    description?: string;
    date: string;
    location?: string;
  },
  organizerId: number,
) => {
  return prisma.event.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      date: new Date(data.date),
      location: data.location ?? null,
      organizerId,
    },
  });
};

export const updateEvent = async (
  id: number,
  data: {
    name?: string;
    description?: string;
    date?: string;
    location?: string;
  },
  userId: number,
) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId)
    throw new Error("Non autorisé à modifier cet événement.");

  const updateData: {
    name?: string;
    description?: string | null;
    date?: Date;
    location?: string | null;
  } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.location !== undefined) updateData.location = data.location;

  return prisma.event.update({ where: { id }, data: updateData });
};

export const deleteEvent = async (id: number, userId: number) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Événement non trouvé.");
  if (event.organizerId !== userId)
    throw new Error("Non autorisé à supprimer cet événement.");

  await prisma.event.delete({ where: { id } });
};
