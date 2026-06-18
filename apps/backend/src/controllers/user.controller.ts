import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await userService.getMe(req.userId!);
    res.json(user);
  } catch (e: any) {
    res.status(404).json({ message: e.message });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const { name, bio } = req.body;
    const user = await userService.updateMe(req.userId!, { name, bio });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier reçu." });
      return;
    }
    const result = await userService.uploadAvatar(req.userId!, req.file.buffer);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(
      req.userId!,
      Number(req.params.id),
    );
    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable." });
      return;
    }
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const q = String(req.query["q"] ?? "");
    const results = await userService.searchUsers(req.userId!, q);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const reportUserHandler = async (req: Request, res: Response) => {
  try {
    const { reason, details } = req.body;
    if (!reason) {
      res.status(400).json({ message: "Le motif est requis." });
      return;
    }
    const result = await userService.reportUser(
      req.userId!,
      Number(req.params.id),
      reason,
      details ?? null,
    );
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const uploadBanner = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier reçu." });
      return;
    }
    const result = await userService.uploadBanner(req.userId!, req.file.buffer);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
