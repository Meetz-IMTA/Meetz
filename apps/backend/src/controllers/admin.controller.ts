import type { Request, Response } from "express";
import {
  getAdminStats,
  getReports,
  updateReportStatus,
  banUserById,
  unbanUserById,
  adminDeleteThread,
  adminDeleteComment,
  adminDeleteMessage,
  getMessageContext,
  getAdminUsers,
  type ReportFilters,
  type AdminUserFilters,
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
    const filters: ReportFilters = {};
    if (type !== undefined)
      filters.type = type as "thread" | "comment" | "message" | "all";
    if (status !== undefined)
      filters.status = status as
        | "pending"
        | "reviewed"
        | "resolved"
        | "ignored"
        | "all";
    if (page) filters.page = Number(page);
    if (limit) filters.limit = Number(limit);
    res.json(await getReports(filters));
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

export const adminDeleteMessageHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    await adminDeleteMessage(Number(req.params["id"]));
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getMessageContextHandler = async (req: Request, res: Response) => {
  try {
    const context = await getMessageContext(Number(req.params["id"]));
    res.json(context);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    const { search, banned, page, limit } = req.query;
    const filters: AdminUserFilters = {};
    if (search !== undefined) filters.search = search as string;
    if (banned === "true") filters.banned = true;
    else if (banned === "false") filters.banned = false;
    if (page) filters.page = Number(page);
    if (limit) filters.limit = Number(limit);
    res.json(await getAdminUsers(filters));
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
};
