import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { listEvents, getEvent, createEventHandler, updateEventHandler, deleteEventHandler } from "../controllers/event.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  },
});

router.get("/", listEvents);
router.get("/:id", getEvent);
router.post("/", authMiddleware, upload.single("image"), createEventHandler);
router.put("/:id", authMiddleware, upload.single("image"), updateEventHandler);
router.delete("/:id", authMiddleware, deleteEventHandler);

export default router;
