import type { Request, Response } from "express";
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent } from "../services/event.service.js";
import { uploadImage } from "../lib/cloudinary.js";

const resolveImageUrl = async (req: Request): Promise<string | undefined> => {
  if (req.file?.buffer) return uploadImage(req.file.buffer);
  return req.body.imageUrl ?? undefined;
};

export const listEvents = async (_req: Request, res: Response) => {
  try {
    res.json(await getEvents());
  } catch {
    res.status(500).json({ error: "Erreur lors de la récupération des événements." });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    res.json(await getEventById(Number(req.params["id"])));
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const createEventHandler = async (req: Request, res: Response) => {
  try {
    const imageUrl = await resolveImageUrl(req);
    res.status(201).json(await createEvent({ ...req.body, imageUrl }, req.userId!));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateEventHandler = async (req: Request, res: Response) => {
  try {
    const imageUrl = await resolveImageUrl(req);
    res.json(await updateEvent(Number(req.params["id"]), { ...req.body, imageUrl }, req.userId!));
  } catch (error: any) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
};

export const deleteEventHandler = async (req: Request, res: Response) => {
  try {
    await deleteEvent(Number(req.params["id"]), req.userId!);
    res.status(204).send();
  } catch (error: any) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
};
