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

// Variante de authMiddleware tolérante à l'expiration, réservée à /logout :
// permet d'invalider le refresh token en base même si l'access token vient
// d'expirer. La signature du token reste vérifiée (un token forgé est rejeté).
export const logoutAuthMiddleware = (
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
    const payload: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, {
      ignoreExpiration: true,
    });
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
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
    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ error: "Accès réservé aux administrateurs." });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

// Rôles autorisés à créer des événements et à coopter.
// Un ADMIN possède les droits d'organisateur.
export const ORGANIZER_ROLES = ["ADMIN", "ORGANIZER"] as const;

export const organizerMiddleware = async (
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
    if (!user || !ORGANIZER_ROLES.includes(user.role as any)) {
      res.status(403).json({ error: "Accès réservé aux organisateurs." });
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
