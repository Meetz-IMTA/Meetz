import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listEvents,
  getEvent,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
} from "../controllers/event.controller.js";

const router = Router();

router.get("/", listEvents);
router.get("/:id", getEvent);
router.post("/", authMiddleware, createEventHandler);
router.put("/:id", authMiddleware, updateEventHandler);
router.delete("/:id", authMiddleware, deleteEventHandler);

export default router;
