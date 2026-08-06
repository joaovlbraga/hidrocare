-- Migration 006: Add qualitative_value column and convert numeric volume_ml
ALTER TABLE fluid_records ADD COLUMN IF NOT EXISTS qualitative_value VARCHAR(50);

-- Migrate existing qualitative entries (containing +, ++, +++) to qualitative_value column
UPDATE fluid_records
SET qualitative_value = volume_ml
WHERE volume_ml ~ '^\+';

-- For database type conversions where volume_ml is converted to numeric/float
