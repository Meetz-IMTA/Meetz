import type { Request, Response } from "express";
import multer from "multer";
import {
  getUserConversations,
  getConversationMessages,
  findOrCreatePrivateConversation,
  getUsers,
} from "../services/chat.service.js";
import { uploadImage } from "../lib/cloudinary.js";

export const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont autorisées"));
  },
});

export const listConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await getUserConversations(req.userId!);
    res.json(conversations);
  } catch {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des conversations." });
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query["page"] as string) || "1");
    const limit = parseInt((req.query["limit"] as string) || "50");
    const messages = await getConversationMessages(
      Number(req.params["id"]),
      req.userId!,
      page,
      limit,
    );
    res.json(messages);
  } catch (error: any) {
    const status = error.message === "Non autorisé" ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
};

export const createPrivateConversation = async (
  req: Request,
  res: Response,
) => {
  try {
    const { targetUserId } = req.body as { targetUserId: number };
    const conversation = await findOrCreatePrivateConversation(
      req.userId!,
      targetUserId,
    );
    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await getUsers(req.userId!);
    res.json(users);
  } catch {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des utilisateurs." });
  }
};

export const uploadChatImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier fourni." });
      return;
    }
    const url = await uploadImage(req.file.buffer, "meetz/chat");
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'upload de l'image." });
  }
};
