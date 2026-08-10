"use client";

import React, { useState } from "react";
import { Plus, Trash2, Loader2, Pill, Lock, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FluidRecord } from "./types";

export type MultiItemSheetCellProps = {
  hour: string;
  category: "MEDICATION" | "OTHER_INPUT" | "OTHER_OUTPUT" | "DRAIN" | "STOOL";
  direction: "INPUT" | "OUTPUT";
  title: string;
  records: FluidRecord[];
  isReadOnly?: boolean;
  /** Volume is optional for DRAIN/STOOL — notes alone are sufficient. */
  volumeOptional?: boolean;
  onAdd: (hour: string, category: string, direction: "INPUT" | "OUTPUT", volumeRaw: string, notes: string) => Promise<void>;
  onDelete: (recordId: number) => Promise<void>;
  onEdit: (recordId: number, volumeRaw: string, notes: string) => Promise<void>;
};

export const MultiItemSheetCell = React.memo(function MultiItemSheetCell({
  hour,
  category,
  direction,
  title,
  records,
  isReadOnly,
  volumeOptional = false,
  onAdd,
  onDelete,
  onEdit,
}: MultiItemSheetCellProps) {
  const [open, setOpen] = useState(false);
  const [itemVol, setItemVol] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const notesInputRef = React.useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);

  const totalVol = records.reduce((sum, r) => sum + (parseFloat(String(r.volume_ml ?? 0)) || 0), 0);

  function startEdit(r: FluidRecord) {
    setEditingId(r.id);
    setItemVol(r.qualitative_value ? r.qualitative_value : (r.volume_ml !== null && r.volume_ml !== undefined ? String(r.volume_ml) : ""));
    setItemNotes(r.notes ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setItemVol("");
    setItemNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const volRaw = itemVol.trim();
    const notesRaw = itemNotes.trim();

    // At least one of volume or notes must be present
    if (volRaw === "" && !notesRaw) return;
    // If volume is required (non-DRAIN/STOOL) and missing, bail
    if (!volumeOptional && volRaw === "") return;

    setSaving(true);
    try {
      if (editingId !== null) {
        await onEdit(editingId, volRaw, notesRaw);
        cancelEdit();
      } else {
        await onAdd(hour, category, direction, volRaw, notesRaw);
        setItemVol("");
        setItemNotes("");
        if (category === "MEDICATION") {
          notesInputRef.current?.focus();
        }
      }
    } catch (err) {
      alert(
        "Não foi possível salvar o lançamento. " +
        (err instanceof Error ? err.message : "Verifique os dados e tente novamente.")
      );
    } finally {
      setSaving(false);
    }
  }

  const isEditing = editingId !== null;

  // Display label for the record volume (may be qualitative)
  function recordVolLabel(r: FluidRecord): string {
    if (r.qualitative_value) return r.qualitative_value;
    if (r.volume_ml !== null && r.volume_ml !== undefined) return `${r.volume_ml} ml`;
    return "—";
  }

  const printSummaryText =
    records.length > 0
      ? records
          .map((r) => `${r.notes ? r.notes + " " : ""}(${recordVolLabel(r)})`)
          .join("\n")
      : "—";

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) cancelEdit(); }}>
      <SheetTrigger asChild>
        <div
          className={cn(
            "flex min-h-7 h-full w-full cursor-pointer items-center justify-center transition-colors hover:bg-slate-100/70 p-0.5 print:p-1 print:h-auto print:min-h-0 print:align-top",
            isReadOnly && "cursor-default"
          )}
        >
          {records.length > 0 ? (
            <div className="flex items-center gap-1 text-slate-800 font-mono text-[11px] font-semibold print:hidden">
              {totalVol > 0 && <span>{totalVol} ml</span>}
              <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-600">
                {records.length}
              </span>
            </div>
          ) : (
            <span className="text-slate-600 text-[11px] hover:text-slate-900 print:hidden">—</span>
          )}
          {isReadOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="ml-0.5 h-2.5 w-2.5 text-slate-400 print:hidden cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                Plantão encerrado — somente administradores podem editar
              </TooltipContent>
            </Tooltip>
          )}
          <span className="hidden print:block font-mono text-[10px] text-black text-center print:whitespace-pre-wrap print:break-words print:overflow-visible print:max-w-none print:min-w-0 print-expand-text leading-tight">
            {printSummaryText}
          </span>
        </div>
      </SheetTrigger>

      <SheetContent side="right" className="w-[380px] sm:w-[440px] p-6 print:hidden">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Pill className="h-4 w-4 text-hospital-600" />
            {title} — Horário {hour}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-600">
            Gerencie múltiplos lançamentos para este horário específico.
          </SheetDescription>
        </SheetHeader>

        {!isReadOnly && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 border-b pb-5">
            {isEditing && (
              <div className="flex items-center justify-between rounded-md bg-blue-50 border border-blue-200 px-3 py-1.5">
                <span className="text-xs font-semibold text-blue-700">Modo edição</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={cancelEdit}
                  className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Descrição / Nome
              </label>
              <div className="relative">
                <Input
                  ref={notesInputRef}
                  placeholder={volumeOptional ? "Ex: Dreno de Tórax, Penrose..." : "Ex: Noradrenalina 0.1 mcg/kg/min"}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  onFocus={(e) => {
                    if (category === "MEDICATION") e.target.select();
                  }}
                  className={cn("h-8 text-xs", category === "MEDICATION" && itemNotes.trim() !== "" ? "pr-7" : "")}
                  required={volumeOptional}
                  list={category === "MEDICATION" ? "medication-list" : undefined}
                />
                {category === "MEDICATION" && itemNotes.trim() !== "" && (
                  <button
                    type="button"
                    title="Limpar"
                    aria-label="Limpar campo"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      setItemNotes("");
                      notesInputRef.current?.focus();
                    }}
                  >
                    <X className="h-full w-full" />
                  </button>
                )}
              </div>
              {category === "MEDICATION" && (
                <datalist id="medication-list">
                  <option value="Adrenalina" />
                  <option value="Amiodarona" />
                  <option value="Ceftriaxona" />
                  <option value="Cefepime" />
                  <option value="Dexmedetomidina (Precedex)" />
                  <option value="Diazepam" />
                  <option value="Dipirona" />
                  <option value="Dobutamina" />
                  <option value="Dopamina" />
                  <option value="Fentanil" />
                  <option value="Haloperidol" />
                  <option value="Heparina" />
                  <option value="Insulina Regular" />
                  <option value="Ketamina" />
                  <option value="Meropenem" />
                  <option value="Midazolam" />
                  <option value="Milrinona" />
                  <option value="Morfina" />
                  <option value="Nitroglicerina (Tridil)" />
                  <option value="Nitroprussiato (Nipride)" />
                  <option value="Noradrenalina" />
                  <option value="Omeprazol" />
                  <option value="Ondansetrona" />
                  <option value="Piperacilina + Tazobactam (Tazocin)" />
                  <option value="Plasmalyte" />
                  <option value="Propofol" />
                  <option value="Ringer Lactato" />
                  <option value="Rocurônio" />
                  <option value="Soro Fisiológico 0.9%" />
                  <option value="Soro Glicosado 5%" />
                  <option value="Succinilcolina" />
                  <option value="Tramadol" />
                  <option value="Vasopressina" />
                </datalist>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Volume (ml){volumeOptional && <span className="ml-1 font-normal text-slate-500">(opcional)</span>}
              </label>
              <Input
                type="text"
                maxLength={50}
                placeholder="Ex: 50 ou ++"
                value={itemVol}
                onChange={(e) => setItemVol(e.target.value)}
                className="h-8 text-xs font-mono"
                required={!volumeOptional}
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-8 bg-hospital-600 hover:bg-hospital-700 text-xs font-semibold"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isEditing ? (
                <Pencil className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              {isEditing ? "Atualizar Lançamento" : "Adicionar Lançamento"}
            </Button>
          </form>
        )}

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b pb-2">
            <span>Lançamentos Registrados ({records.length})</span>
            {totalVol > 0 && (
              <span className="font-mono text-hospital-700 font-extrabold">{totalVol} ml Total</span>
            )}
          </div>

          {records.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-600 italic">
              Nenhum item registrado para este horário.
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {records.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border bg-slate-50 p-2.5 text-xs",
                    editingId === r.id && "border-blue-300 bg-blue-50"
                  )}
                >
                  <div className="space-y-0.5 max-w-[200px]">
                    <p className="font-semibold text-slate-800 truncate">{r.notes || "Sem descrição"}</p>
                    <p className="font-mono font-bold text-hospital-600 text-[11px]">{recordVolLabel(r)}</p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(r)}
                        className="h-7 w-7 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(r.id)}
                        className="h-7 w-7 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
