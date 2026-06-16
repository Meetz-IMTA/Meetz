import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
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

  if (resend) {
    resend.emails
      .send({
        from: "Meetz <hello@meetz.online>",
        to: [data.email],
        subject: "Votre code de vérification Meetz",
        html: `
        <div style="background:#f4f4f5;padding:40px 16px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            <!-- Header -->
            <div style="background:#be123c;padding:32px 40px;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Meetz</span>
            </div>
            <!-- Body -->
            <div style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Bienvenue, ${data.name} !</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Pour activer ton compte, saisis le code ci-dessous dans l'application. Il expire dans <strong style="color:#111827;">10 minutes</strong>.
              </p>
              <!-- OTP block -->
              <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:40px;font-weight:800;color:#be123c;">
                ${otpCode}
              </div>
              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Si tu n'es pas à l'origine de cette inscription, ignore cet email.
              </p>
            </div>
            <!-- Footer -->
            <div style="border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Meetz. · Tous droits réservés</p>
            </div>
          </div>
        </div>
      `,
      })
      .then(({ error }) => {
        if (error) console.warn("failedToSendMail", error.message);
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

  if (user.isBanned)
    throw new Error("Votre compte a été suspendu. Contactez l'administrateur.");

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

export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isVerified) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await prisma.user.update({
    where: { email },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:4200"}/reset-password?token=${token}`;

  if (resend) {
    resend.emails
      .send({
        from: "Meetz <hello@meetz.online>",
        to: [email],
        subject: "Réinitialisation de ton mot de passe Meetz",
        html: `
        <div style="background:#f4f4f5;padding:40px 16px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            <!-- Header -->
            <div style="background:#be123c;padding:32px 40px;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Meetz</span>
            </div>
            <!-- Body -->
            <div style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Réinitialise ton mot de passe</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Tu as demandé à réinitialiser le mot de passe de ton compte Meetz. Clique sur le bouton ci-dessous. Ce lien expire dans <strong style="color:#111827;">30 minutes</strong>.
              </p>
              <!-- CTA button -->
              <a href="${resetUrl}" style="display:inline-block;background:#be123c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">
                Réinitialiser mon mot de passe
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Si tu n'es pas à l'origine de cette demande, ignore cet email. Ton mot de passe ne changera pas.
              </p>
            </div>
            <!-- Footer -->
            <div style="border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Meetz · Tous droits réservés</p>
            </div>
          </div>
        </div>
      `,
      })
      .then(({ error }) => {
        if (error) console.warn("failedToSendResetMail", error.message);
      })
      .catch((err: any) => console.warn("failedToSendResetMail", err.message));
  }
};

export const resetPasswordService = async (
  token: string,
  newPassword: string,
) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) throw new Error("Lien invalide ou expiré.");

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      refreshToken: null, // invalidate all sessions
    },
  });
};
