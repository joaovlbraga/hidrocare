"use client";

import React, { useState, useEffect, KeyboardEvent } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FluidRecord } from "./types";

export type SingleCellInputProps = {
  hour: string;
  category: string;
  direction: "INPUT" | "OUTPUT";
  colIndex: number;
  rowIndex: number;
  existingRecord?: FluidRecord;
  isSaving?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  onSave: (hour: string, category: string, direction: "INPUT" | "OUTPUT", valString: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => void;
};

export const SingleCellInput = React.memo(function SingleCellInput({
  hour,
  category,
  direction,
  colIndex,
  rowIndex,
  existingRecord,
  isSaving,
  isSuccess,
  isError,
  onSave,
  onKeyDown,
}: SingleCellInputProps) {
  const getDisplayVal = (r?: FluidRecord) => {
    if (!r) return "";
    if (r.qualitative_value) return r.qualitative_value;
    if (r.volume_ml !== null && r.volume_ml !== undefined) return String(r.volume_ml);
    return "";
  };

  const [val, setVal] = useState(getDisplayVal(existingRecord));

  useEffect(() => {
    setVal(getDisplayVal(existingRecord));
  }, [existingRecord]);

  return (
    <div className="relative flex items-center justify-center">
      <input
        type="text"
        maxLength={50}
        data-row={rowIndex}
        data-col={colIndex}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => onSave(hour, category, direction, val)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(hour, category, direction, val);
          }
          onKeyDown(e, rowIndex, colIndex);
        }}
        placeholder="—"
        className={cn(
          "h-7 w-full border-none bg-transparent text-center font-mono text-[12px] text-slate-900 transition-all focus:z-10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-hospital-600 rounded-xs print:hidden",
          isError && "bg-red-50 text-red-900 font-bold focus:ring-red-600",
          isSuccess && "bg-emerald-50 text-emerald-900 font-bold",
          val !== "" && !isError && !isSuccess && "font-semibold"
        )}
      />
      <span className="hidden print:block font-mono text-[11px] text-black text-center">
        {existingRecord
          ? existingRecord.qualitative_value
            ? existingRecord.qualitative_value
            : Number.isFinite(parseFloat(String(existingRecord.volume_ml)))
            ? `${existingRecord.volume_ml} ml`
            : String(existingRecord.volume_ml ?? "—")
          : "—"}
      </span>
      {isSaving && (
        <Loader2 className="pointer-events-none absolute right-0.5 h-2.5 w-2.5 animate-spin text-hospital-600 print:hidden" />
      )}
      {isSuccess && !isSaving && (
        <Check className="pointer-events-none absolute right-0.5 h-2.5 w-2.5 text-emerald-600 print:hidden" />
      )}
    </div>
  );
});
