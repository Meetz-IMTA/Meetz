import type { Request, Response } from "express";
import {
  getAdminStats,
  getReports,
  updateReportStatus,
  banUserById,
  unbanUserById,
  adminDeleteThread,
  adminDeleteComment,
  getAdminUsers,
} from "../services/admin.service.js";

export const getStatsHandler = async (_req: Request, res: Response) => {
  try {
    res.json(await getAdminStats());
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

export const listReportsHandler = async (req: Request, res: Response) => {
  try {
    const { type, status, page, limit } = req.query;
    res.json(
      await getReports({
        type: type as "thread" | "comment" | "all" | undefined,
        status: status as
          | "pending"
          | "reviewed"
          | "resolved"
          | "ignored"
          | "all"
          | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      }),
    );
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

export const updateReportStatusHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const report = await updateReportStatus(
      Number(req.params["id"]),
      req.body.status,
    );
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const banUserHandler = async (req: Request, res: Response) => {
  try {
    const user = await banUserById(Number(req.params["id"]), req.body?.reason);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const unbanUserHandler = async (req: Request, res: Response) => {
  try {
    const user = await unbanUserById(Number(req.params["id"]));
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const adminDeleteThreadHandler = async (req: Request, res: Response) => {
  try {
    await adminDeleteThread(Number(req.params["id"]));
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const adminDeleteCommentHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    await adminDeleteComment(Number(req.params["id"]));
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    const { search, banned, page, limit } = req.query;
    res.json(
      await getAdminUsers({
        search: search as string | undefined,
        banned:
          banned === "true" ? true : banned === "false" ? false : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      }),
    );
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};
