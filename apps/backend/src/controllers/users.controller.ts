import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const getSettings = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { readReceipts: true },
    });
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return;
    }
    res.json({ readReceipts: user.readReceipts });
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { readReceipts } = req.body as { readReceipts?: boolean };
    const data: { readReceipts?: boolean } = {};
    if (typeof readReceipts === "boolean") data.readReceipts = readReceipts;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: { readReceipts: true },
    });
    res.json({ readReceipts: user.readReceipts });
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};
