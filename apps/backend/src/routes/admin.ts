import { Router } from "express";
import { adminMiddleware } from "../middlewares/auth.middleware.js";
import {
  getStatsHandler,
  listReportsHandler,
  updateReportStatusHandler,
  banUserHandler,
  unbanUserHandler,
  pinThreadHandler,
  adminDeleteThreadHandler,
  adminDeleteCommentHandler,
  adminDeleteMessageHandler,
  getMessageContextHandler,
  listUsersHandler,
} from "../controllers/admin.controller.js";

const router = Router();

router.use(adminMiddleware);

router.get("/stats", getStatsHandler);
router.get("/reports", listReportsHandler);
router.patch("/reports/:id/status", updateReportStatusHandler);
router.post("/users/:id/ban", banUserHandler);
router.post("/users/:id/unban", unbanUserHandler);
router.get("/users", listUsersHandler);
router.patch("/threads/:id/pin", pinThreadHandler);
router.delete("/threads/:id", adminDeleteThreadHandler);
router.delete("/comments/:id", adminDeleteCommentHandler);
router.delete("/messages/:id", adminDeleteMessageHandler);
router.get("/messages/:id/context", getMessageContextHandler);

export default router;
