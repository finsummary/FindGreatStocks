-- Migration: Add debt_to_equity and interest_coverage columns
-- Run this in Supabase SQL Editor

-- Add columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC(10, 4);

-- Add columns to sp500_companies table
ALTER TABLE sp500_companies
ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC(10, 4);

-- Add columns to nasdaq100_companies table
ALTER TABLE nasdaq100_companies
ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC(10, 4);

-- Add columns to dow_jones_companies table
ALTER TABLE dow_jones_companies
ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC(10, 4);

-- Add columns to ftse100_companies table
ALTER TABLE ftse100_companies
ADD COLUMN IF NOT EXISTS debt_to_equity NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS interest_coverage NUMERIC(10, 4);

