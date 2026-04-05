-- Add shares_outstanding column to all company tables
-- This column stores the number of shares outstanding, which doesn't change daily
-- and can be used to calculate market cap = price * shares_outstanding

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(20, 0);

ALTER TABLE sp500_companies
ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(20, 0);

ALTER TABLE nasdaq100_companies
ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(20, 0);

ALTER TABLE dow_jones_companies
ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(20, 0);

ALTER TABLE ftse100_companies
ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(20, 0);

-- Create indexes for faster queries (optional, but helpful for lookups)
CREATE INDEX IF NOT EXISTS idx_companies_shares_outstanding ON companies(shares_outstanding) WHERE shares_outstanding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp500_shares_outstanding ON sp500_companies(shares_outstanding) WHERE shares_outstanding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nasdaq100_shares_outstanding ON nasdaq100_companies(shares_outstanding) WHERE shares_outstanding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dowjones_shares_outstanding ON dow_jones_companies(shares_outstanding) WHERE shares_outstanding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ftse100_shares_outstanding ON ftse100_companies(shares_outstanding) WHERE shares_outstanding IS NOT NULL;
