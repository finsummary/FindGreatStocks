-- Add last_price_update timestamp column to all company tables
-- This tracks when prices were last updated for each company

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE sp500_companies 
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE nasdaq100_companies 
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE dow_jones_companies 
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE ftse100_companies 
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on last_price_update
CREATE INDEX IF NOT EXISTS idx_companies_last_price_update ON companies(last_price_update);
CREATE INDEX IF NOT EXISTS idx_sp500_last_price_update ON sp500_companies(last_price_update);
CREATE INDEX IF NOT EXISTS idx_nasdaq100_last_price_update ON nasdaq100_companies(last_price_update);
CREATE INDEX IF NOT EXISTS idx_dowjones_last_price_update ON dow_jones_companies(last_price_update);
CREATE INDEX IF NOT EXISTS idx_ftse100_last_price_update ON ftse100_companies(last_price_update);
