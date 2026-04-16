import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MailtrapClient } from "mailtrap";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

const mailtrap = process.env.MAILTRAP_TOKEN
  ? new MailtrapClient({ token: process.env.MAILTRAP_TOKEN })
  : null;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const registerUser = async (data: {
  email: string;
  name: string;
  password: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing && existing.isVerified) {
    throw new Error("Un compte avec cet email existe déjà.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const otpCode = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  let savedUser;
  if (existing && !existing.isVerified) {
    savedUser = await prisma.user.update({
      where: { email: data.email },
      data: { name: data.name, password: hashedPassword, otpCode, otpExpiry },
    });
  } else {
    savedUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        otpCode,
        otpExpiry,
        isVerified: false,
      },
    });
  }

  if (mailtrap) {
    mailtrap
      .send({
        from: { name: "Meetz", email: "hello@demomailtrap.co" },
        to: [{ email: data.email }],
        subject: "Votre code de vérification Meetz",
        html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
          <h2>Bienvenue sur Meetz, ${data.name} !</h2>
          <p>Voici ton code de vérification :</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f4f4f5; border-radius: 8px;">
            ${otpCode}
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Ce code expire dans 10 minutes.</p>
        </div>
      `,
      })
      .catch((err: any) => console.warn("failedToSendMail", err.message));

    return { email: data.email };
  }

  const accessToken = jwt.sign({ userId: savedUser.id }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId: savedUser.id }, REFRESH_SECRET, {
    expiresIn: "7d",
  });

  const verifiedUser = await prisma.user.update({
    where: { email: data.email },
    data: { isVerified: true, otpCode: null, otpExpiry: null, refreshToken },
  });

  const {
    password: _,
    refreshToken: __,
    ...userWithoutPassword
  } = verifiedUser;
  return {
    email: data.email,
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

export const verifyOtpService = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error("Utilisateur non trouvé.");
  if (user.isVerified) throw new Error("Compte déjà vérifié.");
  if (!user.otpCode || user.otpCode !== otp) throw new Error("Code incorrect.");
  if (!user.otpExpiry || user.otpExpiry < new Date())
    throw new Error("Code expiré.");

  const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
    expiresIn: "7d",
  });

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { isVerified: true, otpCode: null, otpExpiry: null, refreshToken },
  });

  const { password: _, refreshToken: __, ...userWithoutPassword } = updatedUser;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const loginUser = async (data: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) throw new Error("Utilisateur non trouvé");
  if (!user.isVerified)
    throw new Error("Compte non vérifié. Vérifie ton email.");

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) throw new Error("Mot de passe incorrect");

  const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  const { password: _, refreshToken: __, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const refreshTokenService = async (token: string) => {
  try {
    const payload: any = jwt.verify(token, REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== token) {
      throw new Error("Token de rafraîchissement invalide");
    }

    const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, {
      expiresIn: "15m",
    });
    const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
      expiresIn: "7d",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error("Token de rafraîchissement invalide");
  }
};

export const logoutUser = async (userId: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};
