import prisma from "../lib/prisma.js";

export const joinEvent = async (userId: number, eventId: number) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Événement non trouvé.");

  try {
    return await prisma.eventParticipation.create({
      data: { userId, eventId },
    });
  } catch {
    throw new Error("Vous participez déjà à cet événement.");
  }
};

export const leaveEvent = async (userId: number, eventId: number) => {
  const participation = await prisma.eventParticipation.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (!participation)
    throw new Error("Vous ne participez pas à cet événement.");
  await prisma.eventParticipation.delete({
    where: { userId_eventId: { userId, eventId } },
  });
};
