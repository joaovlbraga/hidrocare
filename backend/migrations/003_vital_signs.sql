-- Migration 003: Vital Signs Record Table
-- Independent persistence layer for hourly ICU Vital Signs.

CREATE TABLE IF NOT EXISTS vital_sign_records (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  registered_by_id BIGINT NOT NULL REFERENCES users(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  pulse INTEGER CHECK (pulse BETWEEN 20 AND 250),
  blood_pressure VARCHAR(20),
  temperature NUMERIC(4, 1) CHECK (temperature BETWEEN 30.0 AND 45.0),
  respiration INTEGER CHECK (respiration BETWEEN 0 AND 80),
  spo2 INTEGER CHECK (spo2 BETWEEN 0 AND 100),
  hgt INTEGER CHECK (hgt BETWEEN 0 AND 999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patient_vitals_time UNIQUE (patient_id, occurred_at)
);

CREATE INDEX IF NOT EXISTS ix_vital_sign_records_patient_time ON vital_sign_records(patient_id, occurred_at);
