import type { Request, Response } from "express";
import * as cooptationService from "../services/cooptation.service.js";

export const coopt = async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params["id"]);
    const result = await cooptationService.coopt(req.userId!, targetId);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
