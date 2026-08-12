export type FluidRecord = {
  id: number;
  patient_id: number;
  registered_by_id: number;
  updated_by_id?: number | null;
  direction: "INPUT" | "OUTPUT";
  category: string;
  volume_ml: number | string | null;
  qualitative_value?: string | null;
  occurred_at: string;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  registered_by_name?: string | null;
};

export type DailySpreadsheetPayload = {
  fluids: FluidRecord[];
  vitals: VitalSignRecord[];
};

export type VitalSignRecord = {
  id: number;
  patient_id: number;
  registered_by_id: number;
  updated_by_id?: number | null;
  occurred_at: string;
  pulse: number | null;
  blood_pressure: string | null;
  temperature: number | null;
  respiration: number | null;
  spo2: number | null;
  hgt: number | null;
  created_at: string;
};

export type ShiftHour = string;

export type CurrentUser = {
  id: number;
  username: string;
  full_name?: string;
  name?: string;
  role: "ADMIN" | "CLINICAL" | "DEVELOPER";
};

