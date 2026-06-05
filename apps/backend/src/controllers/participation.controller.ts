import type { Request, Response } from "express";
import { joinEvent, leaveEvent } from "../services/participation.service.js";

export const joinHandler = async (req: Request, res: Response) => {
  try {
    await joinEvent(req.userId!, Number(req.params["id"]));
    res.status(201).json({ joined: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const leaveHandler = async (req: Request, res: Response) => {
  try {
    await leaveEvent(req.userId!, Number(req.params["id"]));
    res.status(200).json({ joined: false });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
