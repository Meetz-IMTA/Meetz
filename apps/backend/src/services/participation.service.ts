import prisma from "../lib/prisma.js";
import { notify } from "./notification.service.js";

const addUserToEventConversation = async (userId: number, eventId: number) => {
  const conv = await prisma.conversation.findFirst({
    where: { eventId, type: "EVENT_GROUP" },
  });
  if (!conv) return;
  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conv.id, userId } },
    create: { conversationId: conv.id, userId },
    update: {},
  });
};

const removeUserFromEventConversation = async (
  userId: number,
  eventId: number,
) => {
  const conv = await prisma.conversation.findFirst({
    where: { eventId, type: "EVENT_GROUP" },
  });
  if (!conv) return;
  await prisma.conversationParticipant.deleteMany({
    where: { conversationId: conv.id, userId },
  });
};

export const joinEvent = async (userId: number, eventId: number) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Événement non trouvé.");

  let participation;
  try {
    participation = await prisma.eventParticipation.create({
      data: { userId, eventId },
    });
  } catch {
    throw new Error("Vous participez déjà à cet événement.");
  }

  // Ajouter l'utilisateur au chat de groupe de l'événement.
  try {
    await addUserToEventConversation(userId, eventId);
  } catch (error) {
    console.error("Failed to add user to event conversation:", error);
  }

  // Notifier l'organisateur — sans jamais bloquer l'inscription.
  // (notify() ignore déjà les auto-notifications quand userId === actorId.)
  try {
    await notify({
      userId: event.organizerId,
      actorId: userId,
      type: "event_join",
      eventId,
    });

    // Capacité atteinte : on prévient l'organisateur une seule fois,
    // au moment exact où l'inscription fait atteindre maxAttendees.
    if (event.maxAttendees != null) {
      const count = await prisma.eventParticipation.count({
        where: { eventId },
      });
      if (count === event.maxAttendees) {
        await notify({
          userId: event.organizerId,
          actorId: userId,
          type: "event_full",
          eventId,
        });
      }
    }
  } catch (error) {
    console.error("Failed to send join notifications:", error);
  }

  return participation;
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

  // Retirer l'utilisateur du chat de groupe de l'événement.
  try {
    await removeUserFromEventConversation(userId, eventId);
  } catch (error) {
    console.error("Failed to remove user from event conversation:", error);
  }

  // Notifier l'organisateur — sans jamais bloquer la désinscription.
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });
    if (event) {
      await notify({
        userId: event.organizerId,
        actorId: userId,
        type: "event_leave",
        eventId,
      });
    }
  } catch (error) {
    console.error("Failed to send leave notification:", error);
  }
};
