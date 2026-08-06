-- PostgreSQL: modelo relacional do prontuário hídrico.
CREATE TYPE user_role AS ENUM ('ADMIN', 'CLINICAL');
CREATE TYPE fluid_direction AS ENUM ('INPUT', 'OUTPUT');
CREATE TYPE fluid_type AS ENUM ('ORAL_DIET', 'ENTERAL_DIET', 'IV_HYDRATION', 'MEDICATION', 'TRANSFUSION', 'OTHER_INPUT', 'URINE', 'DRAIN', 'SNE_SNG', 'VOMIT', 'STOOL', 'OTHER_OUTPUT');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY, full_name VARCHAR(150) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, role user_role NOT NULL DEFAULT 'CLINICAL', is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY, medical_record VARCHAR(60) NOT NULL UNIQUE, full_name VARCHAR(150) NOT NULL,
  birth_date DATE NOT NULL, bed VARCHAR(30) NOT NULL, health_insurance VARCHAR(100) NOT NULL DEFAULT 'SUS',
  is_admitted BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE fluid_records (
  id BIGSERIAL PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  registered_by_id BIGINT NOT NULL REFERENCES users(id), direction fluid_direction NOT NULL, category fluid_type NOT NULL,
  volume_ml DOUBLE PRECISION, qualitative_value VARCHAR(50), occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_fluid_records_patient_time ON fluid_records(patient_id, occurred_at);

CREATE TABLE vital_sign_records (
  id BIGSERIAL PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  registered_by_id BIGINT NOT NULL REFERENCES users(id), occurred_at TIMESTAMPTZ NOT NULL,
  pulse INTEGER CHECK (pulse BETWEEN 20 AND 250), blood_pressure VARCHAR(20),
  temperature NUMERIC(4, 1) CHECK (temperature BETWEEN 30.0 AND 45.0),
  respiration INTEGER CHECK (respiration BETWEEN 0 AND 80),
  spo2 INTEGER CHECK (spo2 BETWEEN 0 AND 100), hgt INTEGER CHECK (hgt BETWEEN 0 AND 999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patient_vitals_time UNIQUE (patient_id, occurred_at)
);
CREATE INDEX ix_vital_sign_records_patient_time ON vital_sign_records(patient_id, occurred_at);
