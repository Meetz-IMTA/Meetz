import type { Request, Response } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  deleteAll,
} from "../services/notification.service.js";

export const listNotifications = async (req: Request, res: Response) => {
  try {
    res.json(await getNotifications(req.userId!));
  } catch {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des notifications." });
  }
};

export const unreadCountHandler = async (req: Request, res: Response) => {
  try {
    res.json(await getUnreadCount(req.userId!));
  } catch {
    res.status(500).json({ error: "Erreur." });
  }
};

export const markAllReadHandler = async (req: Request, res: Response) => {
  try {
    await markAllRead(req.userId!);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur." });
  }
};

export const markReadHandler = async (req: Request, res: Response) => {
  try {
    await markRead(Number(req.params["id"]), req.userId!);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur." });
  }
};

export const deleteAllHandler = async (req: Request, res: Response) => {
  try {
    await deleteAll(req.userId!);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erreur." });
  }
};
