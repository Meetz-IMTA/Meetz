import type { Request, Response } from 'express';
import { registerUser } from '../services/auth.service.js';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du compte'
    });
  }
};