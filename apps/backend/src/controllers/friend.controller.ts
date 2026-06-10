import type { Request, Response } from "express";
import * as friendService from "../services/friend.service.js";

export const getFriends = async (req: Request, res: Response) => {
  try {
    const friends = await friendService.getFriends(req.userId!);
    res.json(friends);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await friendService.getRequests(req.userId!);
    res.json(requests);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const sendRequest = async (req: Request, res: Response) => {
  try {
    const receiverId = Number(req.params["userId"]);
    await friendService.sendRequest(req.userId!, receiverId);
    res.status(201).json({ message: "Demande envoyée." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const acceptRequest = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params["requestId"]);
    await friendService.acceptRequest(requestId, req.userId!);
    res.json({ message: "Demande acceptée." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const declineRequest = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params["requestId"]);
    await friendService.declineRequest(requestId, req.userId!);
    res.json({ message: "Demande refusée." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const cancelRequest = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params["requestId"]);
    await friendService.cancelRequest(requestId, req.userId!);
    res.json({ message: "Demande annulée." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const friendId = Number(req.params["userId"]);
    await friendService.removeFriend(req.userId!, friendId);
    res.json({ message: "Ami retiré." });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
