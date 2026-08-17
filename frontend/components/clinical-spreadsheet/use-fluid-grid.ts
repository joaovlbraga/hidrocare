"use client";

import { useState, useEffect, useMemo, useCallback, KeyboardEvent } from "react";
import { apiFetch } from "@/lib/api";
import { FluidRecord, DailySpreadsheetPayload, CurrentUser, VitalSignRecord } from "./types";

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

/**
 * Returns true if the given ISO timestamp is outside the allowed creation window:
 * - More than 24 hours in the past, OR
 * - More than 24 hours in the future.
 * This is a client-side UX convenience check; the backend enforces the same rule.
 */
export function isOutsideAllowedWindow(occurredAt: string): boolean {
  const ts = new Date(occurredAt).getTime();
  const now = Date.now();
  return ts < now - 24 * 60 * 60 * 1000 || ts > now + 24 * 60 * 60 * 1000;
}

export function useFluidGrid(patientId: number, targetDate: string) {
  const [fluids, setFluids] = useState<FluidRecord[]>([]);
  const [vitals, setVitals] = useState<VitalSignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cumulativeBalance, setCumulativeBalance] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});

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

  const isReadOnlyShift = useMemo(() => {
    if (currentUser?.role === "ADMIN") return false;
    const nextDay = getNextDay(targetDate);
    const shiftEnd = new Date(`${nextDay}T07:00:00`);
    return new Date() >= shiftEnd;
  }, [targetDate, currentUser?.role]);

  // Clock ticker: increments every 60 seconds so that per-row
  // isOutsideAllowedWindow() evaluations stay live as wall-clock time advances.
  // This causes the grid to re-render and correctly transition rows between
  // locked/unlocked without requiring a manual page refresh.
  const [_clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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
            // Guard: reject creation if the cell's timestamp is outside the allowed window.
            if (isOutsideAllowedWindow(occurredAt)) {
              setErrorMap((prev) => ({ ...prev, [cellKey]: true }));
              return;
            }
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

        // Guard: reject creation if the cell's timestamp is outside the allowed window.
        if (isOutsideAllowedWindow(occurredAt)) {
          setErrorMap((prev) => ({ ...prev, [cellKey]: true }));
          setSavingMap((prev) => ({ ...prev, [cellKey]: false }));
          return;
        }

        const res = await apiFetch("/vitals/records", {
          method: "POST",
          body: JSON.stringify({
            patient_id: patientId,
            occurred_at: occurredAt,
            [field]: parsedValue,
          }),
        });

        if (existingRecord) {
          setVitals((prev) => 
            prev.map((r) => 
              r.id === existingRecord.id ? { ...r, [field]: parsedValue } : r
            )
          );
        } else {
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
      // Guard: reject creation if the timestamp is outside the allowed window.
      if (isOutsideAllowedWindow(occurredAt)) {
        throw new Error("Não é possível registrar eventos fora da janela de 24 horas permitida.");
      }
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
      // Guard: reject creation if the timestamp is outside the allowed window.
      if (isOutsideAllowedWindow(occurredAt)) {
        throw new Error("Não é possível registrar eventos fora da janela de 24 horas permitida.");
      }
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

  return {
    fluids,
    vitals,
    loading,
    cumulativeBalance,
    currentUser,
    savingMap,
    successMap,
    errorMap,
    isReadOnlyShift,
    fluidsByHourCategoryMap,
    vitalsByHourMap,
    totals,
    triggerSuccess,
    handleFluidCellSave,
    handleVitalCellSave,
    handleAddMultiItemRecord,
    handleUpdateRecord,
    handleAddNutritionRecord,
    handleDeleteRecord,
    handleKeyDown,
    refreshDailyBalance,
  };
}
