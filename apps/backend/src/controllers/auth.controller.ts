import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  refreshTokenService,
  logoutUser,
  verifyOtpService,
} from "../services/auth.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error registering user:", error);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOtpService(email, otp);
    res.json(result);
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    res.status(400).json({ message: error.message || "Code invalide" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(401).json({
      error: "Email ou mot de passe incorrect",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const result = await refreshTokenService(token);
    res.json(result);
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({
      error: "Token de rafraîchissement invalide",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    await logoutUser(refreshToken);
    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
};
