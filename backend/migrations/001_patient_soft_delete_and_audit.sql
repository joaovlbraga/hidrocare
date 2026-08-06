-- Migration 001: Soft Delete & Audit Readiness
-- Add is_active column to patients table for soft deletion.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Verify audit readiness columns on fluid_records:
-- 1. Reference time: occurred_at (TIMESTAMPTZ)
-- 2. Registration timestamp: created_at (TIMESTAMPTZ DEFAULT NOW())
-- 3. Professional user id: registered_by_id (BIGINT REFERENCES users(id))
