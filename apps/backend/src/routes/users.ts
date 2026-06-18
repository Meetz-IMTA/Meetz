import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getSettings,
  updateSettings,
} from "../controllers/users.controller.js";

const router = Router();
router.use(authMiddleware);

router.get("/me/settings", getSettings);
router.patch("/me/settings", updateSettings);

export default router;
