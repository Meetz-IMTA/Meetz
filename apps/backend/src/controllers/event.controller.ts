import type { Request, Response } from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../services/event.service.js";

export const listEvents = async (req: Request, res: Response) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des événements." });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await getEventById(Number(req.params["id"]));
    res.json(event);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const createEventHandler = async (req: Request, res: Response) => {
  try {
    const event = await createEvent(req.body, req.userId!);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateEventHandler = async (req: Request, res: Response) => {
  try {
    const event = await updateEvent(Number(req.params["id"]), req.body, req.userId!);
    res.json(event);
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
