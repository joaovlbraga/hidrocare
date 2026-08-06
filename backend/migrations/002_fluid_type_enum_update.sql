-- Migration 002: FluidType Enum Updates
-- Update fluid_type enum: rename OTHER to OTHER_OUTPUT, add OTHER_INPUT and SNE_SNG.

ALTER TYPE fluid_type RENAME VALUE 'OTHER' TO 'OTHER_OUTPUT';
ALTER TYPE fluid_type ADD VALUE IF NOT EXISTS 'OTHER_INPUT';
ALTER TYPE fluid_type ADD VALUE IF NOT EXISTS 'SNE_SNG';
