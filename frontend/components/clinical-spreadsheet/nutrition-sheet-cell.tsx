"use client";

import React, { useState } from "react";
import { Plus, Trash2, Loader2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FluidRecord } from "./types";

export type NutritionSheetCellProps = {
  hour: string;
  records: FluidRecord[];
  onAdd: (hour: string, category: "ORAL_DIET" | "ENTERAL_DIET", volumeMl: number, notes: string) => Promise<void>;
  onDelete: (recordId: number) => Promise<void>;
};

export const NutritionSheetCell = React.memo(function NutritionSheetCell({
  hour,
  records,
  onAdd,
  onDelete,
}: NutritionSheetCellProps) {
  const [open, setOpen] = useState(false);
  const [dietType, setDietType] = useState<"ORAL_DIET" | "ENTERAL_DIET">("ORAL_DIET");
  const [itemVol, setItemVol] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const totalVol = records.reduce((sum, r) => sum + (parseFloat(String(r.volume_ml ?? 0)) || 0), 0);

  async function handleAddNutrition(e: React.FormEvent) {
    e.preventDefault();
    const vol = parseFloat(itemVol.trim());
    if (!vol || vol <= 0) return;

    setSaving(true);
    try {
      await onAdd(hour, dietType, vol, itemNotes.trim());
      setItemVol("");
      setItemNotes("");
    } finally {
      setSaving(false);
    }
  }

  const printSummaryText = records.length > 0
    ? records.map((r) => `${r.category === "ORAL_DIET" ? "VO" : "SNE"}${r.notes ? " " + r.notes : ""} (${r.volume_ml}ml)`).join("\n")
    : "—";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="flex min-h-7 h-full w-full cursor-pointer items-center justify-center transition-colors hover:bg-slate-100/70 p-0.5 print:p-1 print:h-auto print:min-h-0 print:align-top">
          {records.length > 0 ? (
            <div className="flex items-center gap-1 text-slate-800 font-mono text-[11px] font-semibold print:hidden">
              <span>{totalVol} ml</span>
              <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                {records.length}
              </span>
            </div>
          ) : (
            <span className="text-slate-600 text-[11px] hover:text-slate-900 print:hidden">—</span>
          )}
          <span className="hidden print:block font-mono text-[10px] text-black text-center print:whitespace-pre-wrap print:break-words print:overflow-visible print:max-w-none print:min-w-0 print-expand-text leading-tight">
            {printSummaryText}
          </span>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[440px] p-6 print:hidden">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Utensils className="h-4 w-4 text-emerald-600" />
            Nutrição / Dieta — Horário {hour}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-600">
            Registre oferta de dieta oral ou enteral (SNE/SNG) para este horário.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleAddNutrition} className="mt-5 space-y-3.5 border-b pb-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Tipo de Dieta</label>
            <Select value={dietType} onValueChange={(v) => setDietType(v as any)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORAL_DIET" className="text-xs">Dieta Oral (VO)</SelectItem>
                <SelectItem value="ENTERAL_DIET" className="text-xs">Dieta Enteral (SNE / SNG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Volume (ml)</label>
            <Input
              type="number"
              min="1"
              max="3000"
              placeholder="Ex: 200"
              value={itemVol}
              onChange={(e) => setItemVol(e.target.value)}
              className="h-8 text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Observação / Aceitação (Opcional)</label>
            <Input
              placeholder="Ex: Boa aceitação oral 80%"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Registrar Dieta
          </Button>
        </form>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b pb-2">
            <span>Nutrições Registradas ({records.length})</span>
            <span className="font-mono text-emerald-700 font-extrabold">{totalVol} ml Total</span>
          </div>

          {records.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-600 italic">Nenhuma dieta registrada para este horário.</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border bg-slate-50 p-2.5 text-xs">
                  <div className="space-y-0.5 max-w-[240px]">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {r.category === "ORAL_DIET" ? "Dieta Oral" : "Dieta Enteral"}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{r.volume_ml} ml</span>
                    </div>
                    {r.notes && <p className="text-[11px] text-slate-600 truncate">{r.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(r.id)}
                    className="h-7 w-7 text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
