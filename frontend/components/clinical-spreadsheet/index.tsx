/**
 * Copyright (c) 2026 João Vitor de Lima Braga. All rights reserved.
 * This software is the confidential and proprietary information of João Vitor de Lima Pellegrini Braga.
 * System: HidroCare
 */

"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Alert } from "@/components/ui/alert";

import { useFluidGrid, getOccurredAt, isOutsideAllowedWindow, SHIFT_HOURS } from "./use-fluid-grid";
import { FluidRecord, DailySpreadsheetPayload } from "./types";
import GridHeader from "./grid-header";
import GridRow from "./grid-row";
import GridTotals from "./grid-totals";
import SummaryBar from "./summary-bar";
import PrintSignature from "./print-signature";

type ClinicalSpreadsheetProps = {
  patientId: number;
  targetDate: string; // YYYY-MM-DD
};

export { SHIFT_HOURS, getOccurredAt };
export type { FluidRecord, DailySpreadsheetPayload };

function LoadingSpinner() {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-6 print:hidden">
      <Loader2 className="h-7 w-7 animate-spin text-hospital-600" />
      <p className="text-xs font-medium text-slate-600">Carregando prontuário hídrico da UTI...</p>
    </div>
  );
}

export function ClinicalSpreadsheet({ patientId, targetDate }: ClinicalSpreadsheetProps) {
  const grid = useFluidGrid(patientId, targetDate);

  if (grid.loading) {
    return <LoadingSpinner />;
  }

  // Per-row 24h window state — evaluated at render time so the 60s clock
  // ticker in the hook automatically refreshes these on each tick.
  // isOutsideAllowedWindow() uses Date.now() internally; re-running it on
  // every render triggered by the ticker is sufficient for an hourly grid.
  const rowWindowStates = SHIFT_HOURS.map((hour) =>
    isOutsideAllowedWindow(getOccurredAt(targetDate, hour))
  );
  const lockedByWindowCount = rowWindowStates.filter(Boolean).length;
  const isPartialWindowLock = lockedByWindowCount > 0 && lockedByWindowCount < SHIFT_HOURS.length;
  const isFullWindowLock = lockedByWindowCount === SHIFT_HOURS.length;

  const isPrivileged = grid.currentUser?.role === "ADMIN" || grid.currentUser?.role === "DEVELOPER";

  return (
    <TooltipProvider delayDuration={150}>
      {isPrivileged && (
        <Alert variant="success" className="mb-3 print:hidden">
          Modo Administrador: limites de tempo desativados. Acesso irrestrito a todas as datas.
        </Alert>
      )}
      {!isPrivileged && isFullWindowLock && (
        <Alert variant="warning" className="mb-3 print:hidden">
          <span className="font-semibold">Data fora da janela de registro.{" "}</span>
          Registros só podem ser criados ou editados num intervalo de até 24 horas para trás ou para frente.
          Esta data não permite novos lançamentos, mas você pode visualizar os registros existentes.
        </Alert>
      )}
      {!isPrivileged && isPartialWindowLock && (
        <Alert variant="info" className="mb-3 print:hidden">
          Horários fora da janela de 24 horas estão bloqueados para edição.
        </Alert>
      )}
      <div className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-card overflow-hidden print:border-black print:bg-white print:text-black print:rounded-none print:shadow-none">
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-xs print-table">
            <GridHeader />
            <tbody className="divide-y divide-slate-200 font-mono text-[12px] text-slate-900 print:divide-slate-300 print:text-black">
              {SHIFT_HOURS.map((hour, rowIndex) => (
                <GridRow
                  key={hour}
                  hour={hour}
                  rowIndex={rowIndex}
                  targetDate={targetDate}
                  {...grid}
                />
              ))}
            </tbody>
            <GridTotals totals={grid.totals} />
          </table>
        </div>

        <SummaryBar totals={grid.totals} cumulativeBalance={grid.cumulativeBalance} />
        <PrintSignature currentUser={grid.currentUser} />
      </div>
    </TooltipProvider>
  );
}
