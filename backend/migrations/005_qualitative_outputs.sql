-- Migration 005: Support Qualitative Measurements (+/++/+++) in fluid_records volume_ml
ALTER TABLE fluid_records ALTER COLUMN volume_ml TYPE VARCHAR(50) USING volume_ml::varchar;
