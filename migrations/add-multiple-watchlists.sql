-- Migration: Add support for multiple watchlists per user
-- Run this in Supabase SQL Editor

-- Create watchlists table (container for watchlist groups)
CREATE TABLE IF NOT EXISTS watchlists (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My Watchlist',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add watchlist_id column to existing watchlist table (for backward compatibility)
-- First, create a default watchlist for each existing user
INSERT INTO watchlists (user_id, name, is_default, created_at)
SELECT DISTINCT user_id, 'My Watchlist', true, MIN(created_at)
FROM watchlist
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id, name) DO NOTHING;

-- Add watchlist_id to watchlist table
ALTER TABLE watchlist
ADD COLUMN IF NOT EXISTS watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE;

-- Migrate existing watchlist items to default watchlist
UPDATE watchlist w
SET watchlist_id = wl.id
FROM watchlists wl
WHERE w.user_id = wl.user_id 
  AND wl.is_default = true
  AND w.watchlist_id IS NULL;

-- Make watchlist_id NOT NULL after migration (only if all rows have watchlist_id)
-- First check if there are any NULL values, if so, set them to default watchlist
DO $$
DECLARE
  default_wl_id INTEGER;
BEGIN
  -- Get default watchlist for each user and update NULL watchlist_id
  FOR default_wl_id IN 
    SELECT DISTINCT wl.id 
    FROM watchlists wl 
    WHERE wl.is_default = true
  LOOP
    UPDATE watchlist 
    SET watchlist_id = default_wl_id 
    WHERE watchlist_id IS NULL 
      AND user_id = (SELECT user_id FROM watchlists WHERE id = default_wl_id);
  END LOOP;
  
  -- Now make it NOT NULL if all rows have values
  IF NOT EXISTS (SELECT 1 FROM watchlist WHERE watchlist_id IS NULL) THEN
    ALTER TABLE watchlist ALTER COLUMN watchlist_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_watchlist_id ON watchlist(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

