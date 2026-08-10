"use client";

import React, { useState, useEffect, useMemo, useCallback, KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TooltipProvider } from "@/components/ui/tooltip";

import { FluidRecord, DailySpreadsheetPayload, CurrentUser, VitalSignRecord } from "./types";
import { SingleCellInput } from "./single-cell-input";
import { MultiItemSheetCell } from "./multi-item-sheet-cell";
import { NutritionSheetCell } from "./nutrition-sheet-cell";
import { VitalSignCell } from "./vital-sign-cell";

type ClinicalSpreadsheetProps = {
  patientId: number;
  targetDate: string; // YYYY-MM-DD
};

export const SHIFT_HOURS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00", "23:00",
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00"
];

function getNextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function getOccurredAt(dateStr: string, hourStr: string): string {
  const hourNum = parseInt(hourStr.slice(0, 2), 10);
  const effectiveDate = hourNum >= 7 ? dateStr : getNextDay(dateStr);
  return `${effectiveDate}T${hourStr}:00`;
}

export function ClinicalSpreadsheet({ patientId, targetDate }: ClinicalSpreadsheetProps) {
  const [fluids, setFluids] = useState<FluidRecord[]>([]);
  const [vitals, setVitals] = useState<VitalSignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cumulativeBalance, setCumulativeBalance] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Autosave status maps
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});

  // Fetch authenticated user
  useEffect(() => {
    let active = true;
    apiFetch("/auth/me")
      .then((u: CurrentUser) => {
        if (active && u) setCurrentUser(u);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Derived: is the targetDate shift already closed?
  // The shift for targetDate closes once wall clock >= 07:00 on targetDate+1.
  const isReadOnlyShift = useMemo(() => {
    if (currentUser?.role === "ADMIN") return false;
    const nextDay = getNextDay(targetDate);
    const shiftEnd = new Date(`${nextDay}T07:00:00`);
    return new Date() >= shiftEnd;
  }, [targetDate, currentUser?.role]);

  // Fetch daily fluids data
  const loadFluidsData = useCallback(() => {
    let active = true;
    apiFetch(`/balances/patients/${patientId}/records?target_date=${targetDate}`)
      .then((data: DailySpreadsheetPayload | FluidRecord[]) => {
        if (!active) return;
        if (Array.isArray(data)) {
          setFluids(data);
          setVitals([]);
        } else {
          setFluids(data.fluids || []);
          setVitals(data.vitals || []);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setFluids([]);
          setVitals([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [patientId, targetDate]);

  useEffect(() => {
    setLoading(true);
    return loadFluidsData();
  }, [loadFluidsData]);

  // Fetch daily balance (including cumulative balance)
  const refreshDailyBalance = useCallback(() => {
    let active = true;
    apiFetch(`/balances/patients/${patientId}/daily?target_date=${targetDate}`)
      .then((res: { cumulative_balance?: number }) => {
        if (!active) return;
        if (res && res.cumulative_balance !== undefined) {
          setCumulativeBalance(res.cumulative_balance);
        }
      })
      .catch(() => {
        if (active) setCumulativeBalance(null);
      });
    return () => {
      active = false;
    };
  }, [patientId, targetDate]);

  useEffect(() => {
    return refreshDailyBalance();
  }, [refreshDailyBalance, fluids]);

  // Index map to eliminate linear array filters across 216 cells
  const fluidsByHourCategoryMap = useMemo(() => {
    const map = new Map<string, FluidRecord[]>();
    for (const r of fluids) {
      if (!r.occurred_at) continue;
      const hour = r.occurred_at.slice(11, 16);
      const key = `${hour}-${r.category}`;
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [fluids]);

  const vitalsByHourMap = useMemo(() => {
    const map = new Map<string, VitalSignRecord>();
    for (const r of vitals) {
      if (!r.occurred_at) continue;
      const hour = r.occurred_at.slice(11, 16);
      map.set(hour, r);
    }
    return map;
  }, [vitals]);

  const triggerSuccess = useCallback((cellKey: string) => {
    setSuccessMap((prev) => ({ ...prev, [cellKey]: true }));
    setTimeout(() => {
      setSuccessMap((prev) => ({ ...prev, [cellKey]: false }));
    }, 1500);
  }, []);

  // Handle Fluid Balance single cell save (Numeric or Qualitative +, ++, +++)
  const handleFluidCellSave = useCallback(
    async (
      hour: string,
      category: string,
      direction: "INPUT" | "OUTPUT",
      valString: string
    ) => {
      const cellKey = `fluid-${hour}-${category}`;
      if (savingMap[cellKey]) return;
      const occurredAt = getOccurredAt(targetDate, hour);
      const existingList = fluidsByHourCategoryMap.get(`${hour}-${category}`) || [];
      const existingRecord = existingList[0];

      const trimmed = valString.trim();

      const existingValStr = existingRecord
        ? existingRecord.qualitative_value
          ? existingRecord.qualitative_value
          : existingRecord.volume_ml !== null && existingRecord.volume_ml !== undefined
          ? String(existingRecord.volume_ml)
          : ""
        : "";

      if (existingRecord && existingValStr === trimmed) return;
      if (!existingRecord && trimmed === "") return;

      if (trimmed.length > 50) {
        setErrorMap((prev) => ({ ...prev, [cellKey]: true }));
        return;
      }

      setErrorMap((prev) => ({ ...prev, [cellKey]: false }));
      setSavingMap((prev) => ({ ...prev, [cellKey]: true }));

      try {
        if (trimmed === "") {
          if (existingRecord) {
            await apiFetch(`/balances/records/${existingRecord.id}`, { method: "DELETE" });
            setFluids((prev) => prev.filter((r) => r.id !== existingRecord.id));
            triggerSuccess(cellKey);
          }
        } else {
          const num = parseFloat(trimmed);
          const isQual = Number.isNaN(num);
          const parsedVol = isQual ? null : num;
          const parsedQual = isQual ? trimmed : null;

          if (existingRecord) {
            const res = await apiFetch(`/balances/records/${existingRecord.id}`, {
              method: "PATCH",
              body: JSON.stringify({ volume_ml: trimmed }),
            });
            const updatedVol = res.volume_ml !== undefined && res.volume_ml !== null ? (typeof res.volume_ml === "number" ? res.volume_ml : parseFloat(String(res.volume_ml))) : parsedVol;
            const updatedQual = res.qualitative_value !== undefined ? res.qualitative_value : parsedQual;

            setFluids((prev) =>
              prev.map((r) =>
                r.id === existingRecord.id
                  ? {
                      ...r,
                      volume_ml: Number.isFinite(updatedVol) ? updatedVol : null,
                      qualitative_value: updatedQual,
                    }
                  : r
              )
            );
            triggerSuccess(cellKey);
          } else {
            const res = await apiFetch("/balances/records", {
              method: "POST",
              body: JSON.stringify({
                patient_id: patientId,
                direction,
                category,
                volume_ml: trimmed,
                occurred_at: occurredAt,
              }),
            });

            const createdRecord: FluidRecord = {
              id: res.id,
              patient_id: patientId,
              registered_by_id: 0,
              direction,
              category,
              volume_ml: parsedVol,
              qualitative_value: parsedQual,
              occurred_at: occurredAt,
              notes: null,
              created_at: new Date().toISOString(),
            };
            setFluids((prev) => [...prev, createdRecord]);
            triggerSuccess(cellKey);
          }
        }
        refreshDailyBalance();
      } catch {
        setErrorMap((prev) => ({ ...prev, [cellKey]: true }));
      } finally {
        setSavingMap((prev) => ({ ...prev, [cellKey]: false }));
      }
    },
    [fluidsByHourCategoryMap, patientId, targetDate, triggerSuccess, refreshDailyBalance, savingMap]
  );

  // Handle Vital Sign single cell save (Pulse, BP, Temp, Resp, SpO2, HGT)
  const handleVitalCellSave = useCallback(
    async (hour: string, field: string, valString: string) => {
      const cellKey = `vital-${hour}-${field}`;
      if (savingMap[cellKey]) return;
      
      const occurredAt = getOccurredAt(targetDate, hour);
      const existingRecord = vitalsByHourMap.get(hour);
      const trimmed = valString.trim();

      const existingValStr = existingRecord
        ? (existingRecord[field as keyof VitalSignRecord] !== null && existingRecord[field as keyof VitalSignRecord] !== undefined)
          ? String(existingRecord[field as keyof VitalSignRecord])
          : ""
        : "";

      if (existingRecord && existingValStr === trimmed) return;
      if (!existingRecord && trimmed === "") return;

      setErrorMap((prev) => ({ ...prev, [cellKey]: false }));
      setSavingMap((prev) => ({ ...prev, [cellKey]: true }));

      try {
        const parsedValue = field === "blood_pressure" ? trimmed || null : (trimmed === "" ? null : parseFloat(trimmed));

        const res = await apiFetch("/vitals/records", {
          method: "POST",
          body: JSON.stringify({
            patient_id: patientId,
            occurred_at: occurredAt,
            [field]: parsedValue,
          }),
        });

        if (existingRecord) {
          // Merge partial update into local state without dropping other fields
          setVitals((prev) => 
            prev.map((r) => 
              r.id === existingRecord.id ? { ...r, [field]: parsedValue } : r
            )
          );
        } else {
          // New record created for this hour
          setVitals((prev) => [...prev, res as VitalSignRecord]);
        }
        
        triggerSuccess(cellKey);
      } catch {
        setErrorMap((prev) => ({ ...prev, [cellKey]: true }));
      } finally {
        setSavingMap((prev) => ({ ...prev, [cellKey]: false }));
      }
    },
    [vitalsByHourMap, patientId, targetDate, triggerSuccess, savingMap]
  );

  const handleAddMultiItemRecord = useCallback(
    async (
      hour: string,
      category: string,
      direction: "INPUT" | "OUTPUT",
      volumeRaw: string,
      notes: string
    ) => {
      const occurredAt = getOccurredAt(targetDate, hour);
      const payloadVol = volumeRaw.trim() === "" ? null : volumeRaw.trim();
      const res = await apiFetch("/balances/records", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          direction,
          category,
          volume_ml: payloadVol,
          occurred_at: occurredAt,
          notes,
        }),
      });

      const num = payloadVol !== null ? parseFloat(payloadVol) : null;
      const isQual = payloadVol !== null && Number.isNaN(num);
      const parsedVol = isQual ? null : num;
      const parsedQual = isQual ? payloadVol : null;

      const updatedVol = res.volume_ml !== undefined && res.volume_ml !== null ? (typeof res.volume_ml === "number" ? res.volume_ml : parseFloat(String(res.volume_ml))) : parsedVol;
      const updatedQual = res.qualitative_value !== undefined ? res.qualitative_value : parsedQual;

      const createdRecord: FluidRecord = {
        id: res.id,
        patient_id: patientId,
        registered_by_id: 0,
        direction,
        category,
        volume_ml: Number.isFinite(updatedVol) ? updatedVol : null,
        qualitative_value: updatedQual,
        occurred_at: occurredAt,
        notes,
        created_at: new Date().toISOString(),
      };
      setFluids((prev) => [...prev, createdRecord]);
      refreshDailyBalance();
    },
    [patientId, targetDate, refreshDailyBalance]
  );

  const handleUpdateRecord = useCallback(
    async (recordId: number, volumeRaw: string, notes: string) => {
      const payloadVol = volumeRaw.trim() === "" ? null : volumeRaw.trim();
      const res = await apiFetch(`/balances/records/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify({ volume_ml: payloadVol, notes }),
      });

      const num = payloadVol !== null ? parseFloat(payloadVol) : null;
      const isQual = payloadVol !== null && Number.isNaN(num);
      const parsedVol = isQual ? null : num;
      const parsedQual = isQual ? payloadVol : null;

      const updatedVol = res.volume_ml !== undefined && res.volume_ml !== null ? (typeof res.volume_ml === "number" ? res.volume_ml : parseFloat(String(res.volume_ml))) : parsedVol;
      const updatedQual = res.qualitative_value !== undefined ? res.qualitative_value : parsedQual;

      setFluids((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                volume_ml: Number.isFinite(updatedVol) ? updatedVol : null,
                qualitative_value: updatedQual,
                notes,
              }
            : r
        )
      );
      refreshDailyBalance();
    },
    [refreshDailyBalance]
  );


  const handleAddNutritionRecord = useCallback(
    async (
      hour: string,
      category: "ORAL_DIET" | "ENTERAL_DIET" | "PARENTERAL_NUTRITION" | "FILTERED_WATER",
      volumeMl: number,
      notes: string
    ) => {
      const occurredAt = getOccurredAt(targetDate, hour);
      const res = await apiFetch("/balances/records", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          direction: "INPUT",
          category,
          volume_ml: volumeMl,
          occurred_at: occurredAt,
          notes,
        }),
      });
      const createdRecord: FluidRecord = {
        id: res.id,
        patient_id: patientId,
        registered_by_id: 0,
        direction: "INPUT",
        category,
        volume_ml: volumeMl,
        occurred_at: occurredAt,
        notes,
        created_at: new Date().toISOString(),
      };
      setFluids((prev) => [...prev, createdRecord]);
      refreshDailyBalance();
    },
    [patientId, targetDate, refreshDailyBalance]
  );

  const handleDeleteRecord = useCallback(
    async (recordId: number) => {
      await apiFetch(`/balances/records/${recordId}`, { method: "DELETE" });
      setFluids((prev) => prev.filter((r) => r.id !== recordId));
      refreshDailyBalance();
    },
    [refreshDailyBalance]
  );

  // Keyboard Navigation across 6 single fluid columns
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        nextRow = Math.min(SHIFT_HOURS.length - 1, rowIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextRow = Math.max(0, rowIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (e.currentTarget.selectionEnd === e.currentTarget.value.length) {
          nextCol = Math.min(5, colIndex + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (e.currentTarget.selectionStart === 0) {
          nextCol = Math.max(0, colIndex - 1);
        }
      }

      if (nextRow !== rowIndex || nextCol !== colIndex) {
        const target = document.querySelector<HTMLInputElement>(
          `input[data-row="${nextRow}"][data-col="${nextCol}"]`
        );
        if (target) {
          target.focus();
          target.select();
        }
      }
    },
    []
  );

  // Safe Calculations for totals footer (non-numeric strings +, ++, +++ evaluate to 0 for sum)
  const totals = useMemo(() => {
    const colSums: Record<string, number> = {};
    let totalInputs = 0;
    let totalOutputs = 0;

    for (const r of fluids) {
      const rawVal = r.volume_ml !== null && r.volume_ml !== undefined ? String(r.volume_ml).trim() : "";
      const parsed = parseFloat(rawVal);
      const safeVal = Number.isFinite(parsed) ? parsed : 0;

      colSums[r.category] = (colSums[r.category] || 0) + safeVal;
      if (r.direction === "INPUT") totalInputs += safeVal;
      else totalOutputs += safeVal;
    }

    const netBalance = totalInputs - totalOutputs;
    return { colSums, totalInputs, totalOutputs, netBalance };
  }, [fluids]);

  if (loading) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-6 print:hidden">
        <Loader2 className="h-7 w-7 animate-spin text-hospital-600" />
        <p className="text-xs font-medium text-slate-600">Carregando prontuário hídrico da UTI...</p>
      </div>
    );
  }

  const cumBalanceVal = cumulativeBalance !== null ? cumulativeBalance : totals.netBalance;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-card overflow-hidden print:border-black print:bg-white print:text-black print:rounded-none print:shadow-none">
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-xs print-table">
            <thead>
              {/* Header Row 1: Section Groups */}
              <tr className="border-b border-slate-200 bg-slate-100 font-bold tracking-wider text-slate-700 uppercase print:bg-slate-100 print:text-black print:border-black">
                <th className="w-14 p-1.5 text-center border-r border-slate-200 print:border-black" rowSpan={2}>
                  HORA
                </th>
                <th className="p-1.5 text-center border-r-2 border-r-emerald-300 bg-emerald-50 text-emerald-900 font-extrabold print:bg-emerald-50 print:text-black print:border-black" colSpan={4}>
                  GANHOS (ENTRADAS)
                </th>
                <th className="p-1.5 text-center border-r-2 border-r-rose-300 bg-rose-50 text-rose-900 font-extrabold print:bg-rose-50 print:text-black print:border-black" colSpan={5}>
                  PERDAS (SAÍDAS)
                </th>
                <th className="p-1.5 text-center bg-sky-50 text-sky-900 font-extrabold print:bg-sky-50 print:text-black print:border-black" colSpan={6}>
                  SINAIS VITAIS
                </th>
              </tr>

              {/* Header Row 2: Category Columns */}
              <tr className="border-b-2 border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 print:border-black print:text-black print:bg-white">
                {/* Ganhos (Entradas) */}
                <th className="w-[8%] p-1 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-950 font-bold print:border-black print:bg-white">Medicações</th>
                <th className="w-[7%] p-1 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-950 font-bold print:border-black print:bg-white">Outras Entr.</th>
                <th className="w-[7%] p-1 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-950 font-bold print:border-black print:bg-white">Nutrição</th>
                <th className="w-[6%] p-1 text-center border-r-2 border-r-emerald-300 bg-emerald-50/50 text-emerald-950 font-bold print:border-black print:bg-white">IV Hydr.</th>
                {/* Perdas (Saídas) */}
                <th className="w-[6%] p-1 text-center border-r border-slate-200 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white">Diurese</th>
                <th className="w-[6%] p-1 text-center border-r border-slate-200 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white">SNE/SNG</th>
                <th className="w-[6%] p-1 text-center border-r border-slate-200 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white">Dreno</th>
                <th className="w-[6%] p-1 text-center border-r border-slate-200 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white">Fezes</th>
                <th className="w-[8%] p-1 text-center border-r-2 border-r-rose-300 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white">Outras Saídas</th>
                {/* Sinais Vitais */}
                <th className="w-[5%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white">P</th>
                <th className="w-[7%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white">PA</th>
                <th className="w-[5%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white">T</th>
                <th className="w-[5%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white">R</th>
                <th className="w-[5%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white">SpO2</th>
                <th className="w-[5%] p-1 text-center bg-sky-50/50 text-sky-950 font-bold print:bg-white">HGT</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono text-[12px] text-slate-900 print:divide-slate-300 print:text-black">
              {SHIFT_HOURS.map((hour, rowIndex) => {
                const medsList = fluidsByHourCategoryMap.get(`${hour}-MEDICATION`) || [];
                const otherInputList = fluidsByHourCategoryMap.get(`${hour}-OTHER_INPUT`) || [];
                const nutritionList = [
                  ...(fluidsByHourCategoryMap.get(`${hour}-ORAL_DIET`) || []),
                  ...(fluidsByHourCategoryMap.get(`${hour}-ENTERAL_DIET`) || []),
                  ...(fluidsByHourCategoryMap.get(`${hour}-PARENTERAL_NUTRITION`) || []),
                  ...(fluidsByHourCategoryMap.get(`${hour}-FILTERED_WATER`) || []),
                ];
                const ivRecord = (fluidsByHourCategoryMap.get(`${hour}-IV_HYDRATION`) || [])[0];
                const urineRecord = (fluidsByHourCategoryMap.get(`${hour}-URINE`) || [])[0];
                const sneRecord = (fluidsByHourCategoryMap.get(`${hour}-SNE_SNG`) || [])[0];
                const drainList = fluidsByHourCategoryMap.get(`${hour}-DRAIN`) || [];
                const stoolList = fluidsByHourCategoryMap.get(`${hour}-STOOL`) || [];
                const otherOutputList = fluidsByHourCategoryMap.get(`${hour}-OTHER_OUTPUT`) || [];
                const vitalRecord = vitalsByHourMap.get(hour);

                return (
                  <tr key={hour} className="h-7 hover:bg-slate-50/80 transition-colors print:h-auto print:hover:bg-transparent print:break-inside-avoid">
                    {/* HORA */}
                    <td className="p-0.5 text-center font-bold text-slate-700 bg-slate-100 border-r border-slate-200 print:bg-white print:text-black print:border-black print:h-auto print:align-top">
                      {hour}
                    </td>

                    {/* GANHOS (ENTRADAS) */}
                    {/* Medicações (Multi-Item Sheet Drawer) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <MultiItemSheetCell
                        hour={hour}
                        category="MEDICATION"
                        direction="INPUT"
                        title="Medicações & Infusões"
                        records={medsList}
                        isReadOnly={isReadOnlyShift}
                        onAdd={handleAddMultiItemRecord}
                        onDelete={handleDeleteRecord}
                        onEdit={handleUpdateRecord}
                      />
                    </td>

                    {/* Outras Entradas (Multi-Item Sheet Drawer) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <MultiItemSheetCell
                        hour={hour}
                        category="OTHER_INPUT"
                        direction="INPUT"
                        title="Outras Entradas Hídricas"
                        records={otherInputList}
                        isReadOnly={isReadOnlyShift}
                        onAdd={handleAddMultiItemRecord}
                        onDelete={handleDeleteRecord}
                        onEdit={handleUpdateRecord}
                      />
                    </td>

                    {/* Nutrição / Dieta (Nutrition Sheet Drawer) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <NutritionSheetCell
                        hour={hour}
                        records={nutritionList}
                        isReadOnly={isReadOnlyShift}
                        onAdd={handleAddNutritionRecord}
                        onDelete={handleDeleteRecord}
                      />
                    </td>

                    {/* IV Hydration (Single Input - Col 0) */}
                    <td className="p-0 border-r-2 border-r-emerald-300 print:border-black print:h-auto print:align-top">
                      <SingleCellInput
                        hour={hour}
                        category="IV_HYDRATION"
                        direction="INPUT"
                        colIndex={0}
                        rowIndex={rowIndex}
                        existingRecord={ivRecord}
                        isSaving={savingMap[`fluid-${hour}-IV_HYDRATION`]}
                        isSuccess={successMap[`fluid-${hour}-IV_HYDRATION`]}
                        isError={errorMap[`fluid-${hour}-IV_HYDRATION`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleFluidCellSave}
                        onKeyDown={handleKeyDown}
                      />
                    </td>

                    {/* PERDAS (SAÍDAS) */}
                    {/* Diurese (Single Input - Col 1) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <SingleCellInput
                        hour={hour}
                        category="URINE"
                        direction="OUTPUT"
                        colIndex={1}
                        rowIndex={rowIndex}
                        existingRecord={urineRecord}
                        isSaving={savingMap[`fluid-${hour}-URINE`]}
                        isSuccess={successMap[`fluid-${hour}-URINE`]}
                        isError={errorMap[`fluid-${hour}-URINE`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleFluidCellSave}
                        onKeyDown={handleKeyDown}
                      />
                    </td>

                    {/* SNE / SNG (Single Input - Col 2) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <SingleCellInput
                        hour={hour}
                        category="SNE_SNG"
                        direction="OUTPUT"
                        colIndex={2}
                        rowIndex={rowIndex}
                        existingRecord={sneRecord}
                        isSaving={savingMap[`fluid-${hour}-SNE_SNG`]}
                        isSuccess={successMap[`fluid-${hour}-SNE_SNG`]}
                        isError={errorMap[`fluid-${hour}-SNE_SNG`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleFluidCellSave}
                        onKeyDown={handleKeyDown}
                      />
                    </td>

                    {/* Dreno (Multi-Item Sheet Drawer) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <MultiItemSheetCell
                        hour={hour}
                        category="DRAIN"
                        direction="OUTPUT"
                        title="Drenos"
                        records={drainList}
                        isReadOnly={isReadOnlyShift}
                        volumeOptional
                        onAdd={handleAddMultiItemRecord}
                        onDelete={handleDeleteRecord}
                        onEdit={handleUpdateRecord}
                      />
                    </td>

                    {/* Fezes (Multi-Item Sheet Drawer) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <MultiItemSheetCell
                        hour={hour}
                        category="STOOL"
                        direction="OUTPUT"
                        title="Fezes"
                        records={stoolList}
                        isReadOnly={isReadOnlyShift}
                        volumeOptional
                        onAdd={handleAddMultiItemRecord}
                        onDelete={handleDeleteRecord}
                        onEdit={handleUpdateRecord}
                      />
                    </td>

                    {/* Outras Saídas (Multi-Item Sheet Drawer) */}
                    <td className="p-0 border-r-2 border-r-rose-300 print:border-black print:h-auto print:align-top">
                      <MultiItemSheetCell
                        hour={hour}
                        category="OTHER_OUTPUT"
                        direction="OUTPUT"
                        title="Outras Saídas Hídricas"
                        records={otherOutputList}
                        isReadOnly={isReadOnlyShift}
                        volumeOptional
                        onAdd={handleAddMultiItemRecord}
                        onDelete={handleDeleteRecord}
                        onEdit={handleUpdateRecord}
                      />
                    </td>

                    {/* SINAIS VITAIS */}
                    {/* Pulse (P) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="pulse"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-pulse`]}
                        isSuccess={successMap[`vital-${hour}-pulse`]}
                        isError={errorMap[`vital-${hour}-pulse`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>

                    {/* Blood Pressure (PA) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="blood_pressure"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-blood_pressure`]}
                        isSuccess={successMap[`vital-${hour}-blood_pressure`]}
                        isError={errorMap[`vital-${hour}-blood_pressure`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>

                    {/* Temperature (T) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="temperature"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-temperature`]}
                        isSuccess={successMap[`vital-${hour}-temperature`]}
                        isError={errorMap[`vital-${hour}-temperature`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>

                    {/* Respiration (R) */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="respiration"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-respiration`]}
                        isSuccess={successMap[`vital-${hour}-respiration`]}
                        isError={errorMap[`vital-${hour}-respiration`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>

                    {/* SpO2 */}
                    <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="spo2"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-spo2`]}
                        isSuccess={successMap[`vital-${hour}-spo2`]}
                        isError={errorMap[`vital-${hour}-spo2`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>

                    {/* HGT */}
                    <td className="p-0 print:border-black print:h-auto print:align-top">
                      <VitalSignCell
                        hour={hour}
                        field="hgt"
                        rowIndex={rowIndex}
                        existingRecord={vitalRecord}
                        isSaving={savingMap[`vital-${hour}-hgt`]}
                        isSuccess={successMap[`vital-${hour}-hgt`]}
                        isError={errorMap[`vital-${hour}-hgt`]}
                        isReadOnly={isReadOnlyShift}
                        onSave={handleVitalCellSave}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Footer Row */}
            <tfoot className="print:break-before-avoid">
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-mono font-bold text-[12px] text-slate-900 print:bg-slate-100 print:text-black print:border-black">
                <td className="p-1 text-center text-slate-700 border-r border-slate-200 print:border-black">
                  TOTAIS
                </td>

                {/* Ganhos Column Totals */}
                <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["MEDICATION"] ? `${totals.colSums["MEDICATION"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["OTHER_INPUT"] ? `${totals.colSums["OTHER_INPUT"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
                  {((totals.colSums["ORAL_DIET"] || 0) + (totals.colSums["ENTERAL_DIET"] || 0)) > 0
                    ? `${(totals.colSums["ORAL_DIET"] || 0) + (totals.colSums["ENTERAL_DIET"] || 0)} ml`
                    : "—"}
                </td>
                <td className="p-1 text-center border-r-2 border-r-emerald-300 text-emerald-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["IV_HYDRATION"] ? `${totals.colSums["IV_HYDRATION"]} ml` : "—"}
                </td>

                {/* Perdas Column Totals */}
                <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["URINE"] ? `${totals.colSums["URINE"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["SNE_SNG"] ? `${totals.colSums["SNE_SNG"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["DRAIN"] ? `${totals.colSums["DRAIN"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["STOOL"] ? `${totals.colSums["STOOL"]} ml` : "—"}
                </td>
                <td className="p-1 text-center border-r-2 border-r-rose-300 text-rose-700 font-extrabold print:text-black print:border-black">
                  {totals.colSums["OTHER_OUTPUT"] ? `${totals.colSums["OTHER_OUTPUT"]} ml` : "—"}
                </td>

                {/* Sinais Vitais Totals (Empty) */}
                <td className="p-1 border-r border-slate-200 print:border-black"></td>
                <td className="p-1 border-r border-slate-200 print:border-black"></td>
                <td className="p-1 border-r border-slate-200 print:border-black"></td>
                <td className="p-1 border-r border-slate-200 print:border-black"></td>
                <td className="p-1 border-r border-slate-200 print:border-black"></td>
                <td className="p-1 print:border-black"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Total Summary Footer Bar with Saldo Acumulado */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium print:bg-white print:border-black print:text-black">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold print:text-black">
              Total Entradas: <strong className="font-mono text-sm">{totals.totalInputs} ml</strong>
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 font-bold print:text-black">
              Total Saídas: <strong className="font-mono text-sm">{totals.totalOutputs} ml</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-semibold print:text-black">Saldo Hídrico 24h:</span>
              <span
                className={`rounded-lg px-2.5 py-0.5 font-mono text-sm font-bold border ${
                  totals.netBalance > 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 print:bg-transparent print:text-black print:border-none"
                    : totals.netBalance < 0
                    ? "bg-rose-50 text-rose-800 border-rose-200 print:bg-transparent print:text-black print:border-none"
                    : "bg-slate-100 text-slate-700 border-slate-200 print:bg-transparent print:text-black"
                }`}
              >
                {totals.netBalance > 0 ? `+${totals.netBalance}` : totals.netBalance} ml
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-semibold print:text-black">Saldo Acumulado:</span>
              <span
                className={`rounded-lg px-2.5 py-0.5 font-mono text-sm font-medium border ${
                  cumBalanceVal > 0
                    ? "bg-blue-50 text-blue-700 border-blue-200 print:bg-transparent print:text-black print:border-none"
                    : cumBalanceVal < 0
                    ? "bg-red-50 text-red-700 border-red-200 print:bg-transparent print:text-black print:border-none"
                    : "bg-slate-100 text-slate-700 border-slate-200 print:bg-transparent print:text-black"
                }`}
              >
                {cumBalanceVal > 0 ? `+${cumBalanceVal}` : cumBalanceVal} ml
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Nursing Signature and Stamp Footer for Paper Printouts */}
      <div className="hidden print:block print-signature print:mt-3 print:pt-2 mt-8 pt-4 border-t border-black text-black">
        <div className="flex justify-between items-end text-[10px]">
          <div className="space-y-1">
            <p><strong>Responsável Técnico:</strong> {currentUser?.full_name ?? currentUser?.name ?? "Profissional Não Identificado"}</p>
            <p><strong>Data de Impressão:</strong> {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="text-center w-64">
            <div className="border-b border-black mb-1 h-8"></div>
            <p className="font-bold">Assinatura e Carimbo do Profissional</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
