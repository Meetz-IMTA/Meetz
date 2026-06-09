import { Router } from "express";
import multer from "multer";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware.js";
import {
  listCategories,
  getCategory,
  createCategoryHandler,
  listThreads,
  getThread,
  createThreadHandler,
  updateThreadHandler,
  deleteThreadHandler,
  toggleLikeHandler,
  reportThreadHandler,
  createCommentHandler,
  deleteCommentHandler,
  toggleCommentLikeHandler,
  reportCommentHandler,
} from "../controllers/community.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  },
});

// Categories
router.get("/categories", listCategories);
router.get("/categories/:id", getCategory);
router.post("/categories", authMiddleware, createCategoryHandler);

// Threads
router.get("/threads", listThreads);
router.get("/threads/:id", optionalAuthMiddleware, getThread);
router.post(
  "/threads",
  authMiddleware,
  upload.array("images", 5),
  createThreadHandler,
);
router.put(
  "/threads/:id",
  authMiddleware,
  upload.array("images", 5),
  updateThreadHandler,
);
router.delete("/threads/:id", authMiddleware, deleteThreadHandler);

// Likes
router.post("/threads/:id/like", authMiddleware, toggleLikeHandler);

// Reports
router.post("/threads/:id/report", authMiddleware, reportThreadHandler);

// Comments
router.post(
  "/threads/:id/comments",
  authMiddleware,
  upload.single("image"),
  createCommentHandler,
);
router.delete("/comments/:commentId", authMiddleware, deleteCommentHandler);
router.post(
  "/comments/:commentId/like",
  authMiddleware,
  toggleCommentLikeHandler,
);
router.post(
  "/comments/:commentId/report",
  authMiddleware,
  reportCommentHandler,
);

export default router;
