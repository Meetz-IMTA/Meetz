import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const payload: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }
  try {
    const payload: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    req.userId = payload.userId;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Accès réservé aux administrateurs." });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const payload: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
      req.userId = payload.userId;
    } catch {}
  }
  next();
};
