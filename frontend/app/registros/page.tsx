"use client";

import { useEffect, useState } from "react";
import { Calendar, User, Activity, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicalSpreadsheet } from "@/components/clinical-spreadsheet";
import { apiFetch } from "@/lib/api";

type Patient = {
  id: number;
  full_name: string;
  uti?: string;
  bed: string;
  medical_record: string;
  health_insurance?: string;
};

export default function RecordsPage() {
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string>("");

  useEffect(() => {
    apiFetch("/patients")
      .then((data: Patient[]) => {
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(String(data[0].id));
        }
      })
      .catch((err: Error) => {
        setPatients([]);
        setError(err.message || "Não foi possível carregar os pacientes.");
      });
  }, []);

  const loadingPatients = patients === null;
  const activePatient = (patients ?? []).find((p) => String(p.id) === selectedPatientId);

  return (
    <AppShell>
      <div className="space-y-3 print:space-y-1.5">
        {/* Compact Top Header & Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-hospital-700 text-white shadow-xs">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Prontuário Hídrico da UTI</h1>
              <p className="text-[11px] text-slate-500">Grade de lançamento em 24h & Acompanhamento Assistencial</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Patient Selector */}
            <div className="w-64 sm:w-72">
              {loadingPatients ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger id="patient_select" aria-label="Paciente em Leito" className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(patients ?? []).map((patient) => (
                      <SelectItem key={patient.id} value={String(patient.id)} className="text-xs">
                        {patient.uti || "UTI 1"} — Leito {patient.bed} · {patient.full_name} ({patient.medical_record})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date Selector */}
            <div className="relative w-36 sm:w-40">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                id="date_select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 pl-8 text-xs font-mono"
              />
            </div>

            {/* Active Patient Badge */}
            {activePatient && (
              <div className="hidden xl:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                <User className="h-3.5 w-3.5 text-hospital-700 shrink-0" />
                <span className="font-bold text-slate-900 truncate max-w-[180px]">{activePatient.full_name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 font-mono">{activePatient.uti || "UTI 1"} · Leito {activePatient.bed}</span>
              </div>
            )}

            {/* Print Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              disabled={!selectedPatientId}
              className="h-9 text-xs gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Print-Only Official Header Banner */}
        {activePatient && (
          <div className="hidden print:block print:mb-1.5 border-b-2 border-slate-900 pb-1.5 text-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold uppercase tracking-wider leading-tight">HidroCare — Balanço Hídrico da UTI (24h)</h1>
                <p className="text-[10px] text-slate-700">Registro Clínico Assistencial do Plantão</p>
              </div>
              <div className="text-right text-[10px]">
                <p><strong>Data do Plantão:</strong> {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-5 gap-2 text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-300">
              <p><strong>Paciente:</strong> {activePatient.full_name}</p>
              <p><strong>Unidade:</strong> {activePatient.uti || "UTI 1"}</p>
              <p><strong>Leito:</strong> {activePatient.bed}</p>
              <p><strong>Prontuário:</strong> {activePatient.medical_record}</p>
              <p><strong>Convênio:</strong> {activePatient.health_insurance || "SUS"}</p>
            </div>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {/* Data Grid Section */}
        {selectedPatientId ? (
          <ClinicalSpreadsheet patientId={Number(selectedPatientId)} targetDate={selectedDate} />
        ) : (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-12 text-center text-slate-500 text-xs">
              Selecione um paciente acima para visualizar e editar a grade de balanço hídrico.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
