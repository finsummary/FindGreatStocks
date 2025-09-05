import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import * as dotenv from 'dotenv';

export function createIsAuthenticatedMiddleware(supabase: SupabaseClient) {
  return async function isAuthenticated(req: any, res: Response, next: NextFunction) {
    console.log(`[AUTH] Middleware triggered for: ${req.originalUrl}`);
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] FAIL: No Bearer token provided.');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[AUTH] OK: Token found in header.');

    try {
      console.log('[AUTH] STEP: Verifying token with Supabase...');
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        console.error('[AUTH] FAIL: Supabase token verification failed.', error);
        return res.status(401).json({ message: 'Unauthorized: Invalid token', error: error?.message });
      }
      console.log(`[AUTH] OK: Supabase user found: ${supabaseUser.email}`);

      console.log(`[AUTH] STEP: Upserting user into local DB...`);
      await storage.upsertUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        updatedAt: new Date(),
      });
      console.log(`[AUTH] OK: User upserted.`);

      console.log(`[AUTH] STEP: Fetching full user profile from local DB...`);
      const dbUser = await storage.getUser(supabaseUser.id);
      
      if (!dbUser) {
        console.error(`[AUTH] FAIL: User upserted but could not be found in DB immediately after. User ID: ${supabaseUser.id}`);
        return res.status(401).json({ message: 'Unauthorized: User not found in database' });
      }
      console.log(`[AUTH] OK: Full user profile fetched from DB.`);

      req.user = dbUser;
      console.log(`[AUTH] SUCCESS: Authentication complete for ${req.user.email}.`);

      next();
    } catch (error) {
      console.error("[AUTH] FATAL: An unexpected error occurred in authentication middleware:", error);
      return res.status(500).json({ message: 'Internal Server Error during authentication' });
    }
  }
}


