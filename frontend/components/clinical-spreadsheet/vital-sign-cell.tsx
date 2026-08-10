"use client";

import React, { useState, useEffect, KeyboardEvent } from "react";
import { Loader2, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VitalSignRecord } from "./types";

export type VitalSignCellProps = {
  hour: string;
  field: "pulse" | "blood_pressure" | "temperature" | "respiration" | "spo2" | "hgt";
  rowIndex: number;
  existingRecord?: VitalSignRecord;
  isSaving?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  isReadOnly?: boolean;
  onSave: (hour: string, field: string, valString: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>, rowIndex: number) => void;
};

export const VitalSignCell = React.memo(function VitalSignCell({
  hour,
  field,
  rowIndex,
  existingRecord,
  isSaving,
  isSuccess,
  isError,
  isReadOnly,
  onSave,
  onKeyDown,
}: VitalSignCellProps) {
  const getDisplayVal = (r?: VitalSignRecord, f?: string) => {
    if (!r || !f) return "";
    const val = r[f as keyof VitalSignRecord];
    if (val !== null && val !== undefined) return String(val);
    return "";
  };

  const [val, setVal] = useState(getDisplayVal(existingRecord, field));

  useEffect(() => {
    setVal(getDisplayVal(existingRecord, field));
  }, [existingRecord, field]);

  // Client-side quick sanity check to flag error early
  const isClientError = React.useMemo(() => {
    if (val === "") return false;
    
    if (field === "blood_pressure") {
      // Loose regex for blood pressure e.g., 120x80 or 120/80
      return !/^\d{2,3}[x/]\d{2,3}$/.test(val.trim());
    }
    
    const num = parseFloat(val);
    if (isNaN(num)) return true;
    
    if (field === "pulse" && (num < 0 || num > 300)) return true;
    if (field === "temperature" && (num < 20 || num > 45)) return true;
    if (field === "respiration" && (num < 0 || num > 100)) return true;
    if (field === "spo2" && (num < 0 || num > 100)) return true;
    if (field === "hgt" && (num < 0 || num > 1000)) return true;
    
    return false;
  }, [val, field]);

  const displayError = isError || isClientError;

  return (
    <div className="relative flex items-center justify-center">
      <input
        type="text"
        maxLength={20}
        data-row={rowIndex}
        data-vital-field={field}
        value={val}
        disabled={isReadOnly}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => !isReadOnly && onSave(hour, field, val)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (onKeyDown) {
            onKeyDown(e, rowIndex);
          }
        }}
        placeholder="—"
        className={cn(
          "h-7 w-full border-none bg-transparent text-center font-mono text-[12px] text-slate-900 transition-all focus:z-10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-600 rounded-xs print:hidden",
          isReadOnly && "cursor-not-allowed opacity-60 bg-slate-50",
          displayError && "bg-red-50 text-red-900 font-bold focus:ring-red-600",
          isSuccess && "bg-sky-50 text-sky-900 font-bold",
          val !== "" && !displayError && !isSuccess && !isReadOnly && "font-semibold"
        )}
      />
      <span className="hidden print:block font-mono text-[11px] text-black text-center">
        {val !== "" ? val : "—"}
      </span>
      {isReadOnly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="pointer-events-auto absolute right-0.5 h-2.5 w-2.5 text-slate-400 print:hidden cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
            Plantão encerrado — somente administradores podem editar
          </TooltipContent>
        </Tooltip>
      )}
      {isSaving && !isReadOnly && (
        <Loader2 className="pointer-events-none absolute right-0.5 h-2.5 w-2.5 animate-spin text-sky-600 print:hidden" />
      )}
      {isSuccess && !isSaving && !isReadOnly && (
        <Check className="pointer-events-none absolute right-0.5 h-2.5 w-2.5 text-sky-600 print:hidden" />
      )}
    </div>
  );
});
