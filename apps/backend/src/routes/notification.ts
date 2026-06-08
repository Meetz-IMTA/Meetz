import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listNotifications,
  unreadCountHandler,
  markAllReadHandler,
  markReadHandler,
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", authMiddleware, listNotifications);
router.get("/unread-count", authMiddleware, unreadCountHandler);
router.post("/read", authMiddleware, markAllReadHandler);
router.post("/:id/read", authMiddleware, markReadHandler);

export default router;
