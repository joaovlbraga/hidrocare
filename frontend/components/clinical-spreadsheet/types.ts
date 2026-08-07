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
};

export type DailySpreadsheetPayload = {
  fluids: FluidRecord[];
};

export type ShiftHour = string;

export type CurrentUser = {
  full_name?: string;
  name?: string;
  role: "ADMIN" | "CLINICAL";
};

