import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  verifyOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
