import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  refreshTokenService,
  logoutUser,
  verifyOtpService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error registering user:", error);
    res
      .status(400)
      .json({ message: error.message || "Erreur lors de l'inscription" });
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await forgotPasswordService(email);
    // Always 200 to avoid user enumeration
    res.json({ message: "Si cet email existe, un lien a été envoyé." });
  } catch (error) {
    console.error("Error sending reset email:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    await resetPasswordService(token, password);
    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    res
      .status(400)
      .json({ message: error.message || "Lien invalide ou expiré." });
  }
};
