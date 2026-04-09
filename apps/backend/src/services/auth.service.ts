import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export const registerUser = async (data: {
  email: string;
  name: string;
  password: string;
}) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const { password: _, ...user } = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword
    }
  });
  return user;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) throw new Error('Utilisateur non trouvé');

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) throw new Error('Mot de passe incorrect');

  const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  const { password: _,refreshToken:__, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const refreshTokenService = async (token: string) => {
  try {

    const payload: any = jwt.verify(token, REFRESH_SECRET);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });


    if (!user || user.refreshToken !== token) {
      throw new Error('Token de rafraîchissement invalide');
    }

    const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error('Token de rafraîchissement invalide');
  }
};

export const logoutUser = async (userId: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null }
  });
};