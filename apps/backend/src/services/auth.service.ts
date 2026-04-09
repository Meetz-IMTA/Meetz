import prisma from '../lib/prisma.js';

export const registerUser = async (data: {
  email: string;
  name: string;
  password: string;
}) => {
  return prisma.user.create({
    data
  });
};