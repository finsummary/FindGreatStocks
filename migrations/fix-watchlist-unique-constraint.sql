-- Migration: Fix watchlist unique constraint to include watchlist_id
-- This allows the same company to exist in multiple watchlists for the same user
-- Run this in Supabase SQL Editor

-- Drop the old unique constraint
ALTER TABLE watchlist 
DROP CONSTRAINT IF EXISTS watchlist_user_company_unique;

-- Create new unique constraint that includes watchlist_id
ALTER TABLE watchlist 
ADD CONSTRAINT watchlist_user_company_watchlist_unique 
UNIQUE(user_id, company_symbol, watchlist_id);

