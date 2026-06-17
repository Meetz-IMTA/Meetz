import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getMe,
  updateMe,
  uploadAvatar,
  uploadBanner,
  getUserById,
  searchUsers,
  reportUserHandler,
} from "../controllers/user.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont acceptées."));
  },
});

router.use(authMiddleware);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.post("/me/avatar", upload.single("avatar"), uploadAvatar);
router.post("/me/banner", upload.single("banner"), uploadBanner);
router.get("/search", searchUsers);
router.post("/:id/report", reportUserHandler);
router.get("/:id", getUserById);

export default router;
