-- Migration: Add roic_stability, roic_stability_score, and fcf_margin columns
-- Run this in Supabase SQL Editor

-- Add columns to sp500_companies table
ALTER TABLE sp500_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to companies table (for consistency)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to nasdaq100_companies table (for consistency)
ALTER TABLE nasdaq100_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to dow_jones_companies table (for consistency)
ALTER TABLE dow_jones_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to ftse100_companies table (for consistency)
ALTER TABLE ftse100_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

