-- Migration: Add cash_flow_to_debt column
-- Run this in Supabase SQL Editor

-- Add column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cash_flow_to_debt NUMERIC(10, 4);

-- Add column to sp500_companies table
ALTER TABLE sp500_companies
ADD COLUMN IF NOT EXISTS cash_flow_to_debt NUMERIC(10, 4);

-- Add column to nasdaq100_companies table
ALTER TABLE nasdaq100_companies
ADD COLUMN IF NOT EXISTS cash_flow_to_debt NUMERIC(10, 4);

-- Add column to dow_jones_companies table
ALTER TABLE dow_jones_companies
ADD COLUMN IF NOT EXISTS cash_flow_to_debt NUMERIC(10, 4);

-- Add column to ftse100_companies table
ALTER TABLE ftse100_companies
ADD COLUMN IF NOT EXISTS cash_flow_to_debt NUMERIC(10, 4);

