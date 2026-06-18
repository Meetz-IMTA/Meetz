import prisma from "../lib/prisma.js";
import { notify } from "./notification.service.js";

// Quota de cooptations « à vie » accordé à un organisateur.
// Les ADMIN ne sont pas soumis à ce quota.
export const COOPTATION_QUOTA = 5;

const ORGANIZER_ROLES = ["ADMIN", "ORGANIZER"] as const;

const areFriends = async (a: number, b: number): Promise<boolean> => {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: a, userBId: b },
        { userAId: b, userBId: a },
      ],
    },
  });
  return friendship != null;
};

/**
 * Coopte un ami comme ORGANIZER.
 *
 * Règles : l'auteur doit être organisateur (ou admin), la cible doit être un
 * ami déjà validé et un simple USER, et l'auteur ne doit pas avoir épuisé son
 * quota de cooptations à vie. L'action est définitive.
 */
export const coopt = async (authorId: number, targetId: number) => {
  if (authorId === targetId) {
    throw new Error("Vous ne pouvez pas vous coopter vous-même.");
  }

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { id: true, role: true, _count: { select: { coopted: true } } },
  });
  if (!author) throw new Error("Utilisateur introuvable.");
  if (!ORGANIZER_ROLES.includes(author.role as any)) {
    throw new Error("Seul un organisateur peut coopter.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, isVerified: true },
  });
  if (!target || !target.isVerified) {
    throw new Error("Utilisateur introuvable.");
  }
  if (target.role !== "USER") {
    throw new Error("Cet utilisateur est déjà organisateur.");
  }

  if (!(await areFriends(authorId, targetId))) {
    throw new Error("Vous ne pouvez coopter que vos amis.");
  }

  // Le quota ne s'applique pas aux administrateurs.
  if (
    author.role === "ORGANIZER" &&
    author._count.coopted >= COOPTATION_QUOTA
  ) {
    throw new Error("Vous avez épuisé votre quota de cooptations.");
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      role: "ORGANIZER",
      cooptedById: authorId,
      cooptedAt: new Date(),
    },
    select: { id: true, name: true, role: true, cooptedAt: true },
  });

  // Notifie la personne cooptée (fire-and-forget, ne casse pas la cooptation).
  notify({ userId: targetId, actorId: authorId, type: "cooptation" });

  return updated;
};
