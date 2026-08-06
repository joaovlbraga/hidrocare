-- Migration 004: Add Health Insurance (Convênio) Field to Patients Table

ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_insurance VARCHAR(100) NOT NULL DEFAULT 'SUS';
