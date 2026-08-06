export type FluidRecord = {
  id: number;
  patient_id: number;
  registered_by_id: number;
  direction: "INPUT" | "OUTPUT";
  category: string;
  volume_ml: number | string | null;
  qualitative_value?: string | null;
  occurred_at: string;
  notes: string | null;
  created_at: string;
};

export type DailySpreadsheetPayload = {
  fluids: FluidRecord[];
};

export type ShiftHour = string;
