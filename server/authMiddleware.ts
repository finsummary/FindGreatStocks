import { supabase } from './supabase';
import type { Request, Response, NextFunction } from 'express';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Authentication error:', error?.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user to the request object for downstream handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Unexpected error during authentication:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};


