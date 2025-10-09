import { SupabaseClient } from '@supabase/supabase-js';
import type { Response, NextFunction } from 'express';

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

      console.log(`[AUTH] STEP: Upserting user into Supabase 'users' table...`);
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: supabaseUser.id,
          email: supabaseUser.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (upsertError) {
        console.error('[AUTH] FAIL: Supabase upsert user failed.', upsertError);
        return res.status(500).json({ message: 'Internal error upserting user' });
      }

      console.log(`[AUTH] STEP: Fetching full user profile from Supabase...`);
      const { data: dbUser, error: readError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      if (readError) {
        console.error('[AUTH] FAIL: Supabase read user failed.', readError);
        return res.status(500).json({ message: 'Internal error reading user' });
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        subscriptionTier: dbUser.subscription_tier || 'free',
      };
      console.log(`[AUTH] SUCCESS: Authentication complete for ${req.user.email}.`);

      next();
    } catch (error) {
      console.error("[AUTH] FATAL: An unexpected error occurred in authentication middleware:", error);
      return res.status(500).json({ message: 'Internal Server Error during authentication' });
    }
  }
}


