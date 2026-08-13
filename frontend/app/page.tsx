/**
 * Copyright (c) 2026 João Vitor de Pellegrini Lima Braga. All rights reserved.
 * This software is the confidential and proprietary information of João Vitor de Lima Pellegrini Braga.
 * System: HidroCare
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingUp, Users, Building2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api";

type Patient = { id: number; full_name: string; uti?: string; bed: string; medical_record: string; is_admitted: boolean };
type DailyBalance = { patient_id: number; date: string; input_ml: number; output_ml: number; balance_ml: number; status: string; qualitative_records: FluidRecord[] };

type FluidRecord = {
  id: number;
  category: string;
  volume_ml: number | string | null;
  qualitative_value: string | null;
  notes: string | null;
  occurred_at: string;
};

type PatientBalance = Patient & { balance: DailyBalance | null; qualitativeRecords?: FluidRecord[] };

const categoryLabels: Record<string, string> = {
  ORAL_DIET: "Dieta Oral",
  ENTERAL_DIET: "SNE",
  PARENTERAL_NUTRITION: "NPT",
  FILTERED_WATER: "H₂O",
  IV_HYDRATION: "Hidratação IV",
  MEDICATION: "Medicação",
  TRANSFUSION: "Transfusão",
  OTHER_INPUT: "Outro (Ganho)",
  URINE: "Diurese",
  STOOL: "Fezes",
  VOMIT: "Vômito",
  DRAIN: "Dreno",
  BLEEDING: "Sangramento",
  OTHER_OUTPUT: "Outro (Perda)",
  SNE_SNG: "SNE/SNG"
};

function formatCategory(category: string) {
  return categoryLabels[category] || category;
}

const WARNING_THRESHOLD_ML = 500;
const CRITICAL_THRESHOLD_ML = 1500;

function severityOf(balanceMl: number): "stable" | "warning" | "critical" {
  const abs = Math.abs(balanceMl);
  if (abs >= CRITICAL_THRESHOLD_ML) return "critical";
  if (abs >= WARNING_THRESHOLD_ML) return "warning";
  return "stable";
}

const severityLabel: Record<"stable" | "warning" | "critical", string> = {
  stable: "Estável",
  warning: "Atenção",
  critical: "Crítico",
};

function formatMl(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR")} ml`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function naturalSortBed(aBed: string, bBed: string): number {
  return aBed.localeCompare(bBed, undefined, { numeric: true, sensitivity: "base" });
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [patients, setPatients] = useState<PatientBalance[] | null>(null);
  const [error, setError] = useState("");
  const [activeUtiTab, setActiveUtiTab] = useState<"UTI 1" | "UTI 2">("UTI 1");

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function load() {
      setError("");
      try {
        const list: Patient[] = await apiFetch("/patients");
        const withBalances = await Promise.all(
          list.map(async (patient) => {
            try {
              const balance: DailyBalance = await apiFetch(`/balances/patients/${patient.id}/daily?target_date=${todayIso()}`);
              const qualitativeRecords: FluidRecord[] = balance.qualitative_records || [];
              return { ...patient, balance, qualitativeRecords };
            } catch {
              return { ...patient, balance: null, qualitativeRecords: [] };
            }
          })
        );
        if (!cancelled) setPatients(withBalances);
      } catch (err) {
        if (!cancelled) {
          setPatients([]);
          setError(err instanceof Error ? err.message : "Não foi possível carregar os dados do dashboard.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const loading = patients === null;

  // Filter patients by active UTI tab and sort naturally by Bed
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients
      .filter((p) => (p.uti || "UTI 1") === activeUtiTab)
      .sort((a, b) => naturalSortBed(a.bed, b.bed));
  }, [patients, activeUtiTab]);

  // Overall metrics and alerts across all monitored patients
  const withBalance = (patients ?? []).filter((p): p is PatientBalance & { balance: DailyBalance } => p.balance !== null);
  const alertsCount = withBalance.filter((p) => severityOf(p.balance.balance_ml) !== "stable").length;
  const averageBalance = withBalance.length
    ? Math.round(withBalance.reduce((sum, p) => sum + p.balance.balance_ml, 0) / withBalance.length)
    : 0;

  const chartData = filteredPatients
    .filter((p): p is PatientBalance & { balance: DailyBalance } => p.balance !== null)
    .map((p) => ({
      label: `L.${p.bed}`,
      entradas: p.balance.input_ml,
      saidas: p.balance.output_ml,
    }));

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeader
            title="Visão geral do plantão UTI"
            description={`Acompanhamento assistencial por Unidade UTI · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`}
          />

          {/* UTI Tabs Selector */}
          <div className="flex items-center rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
            {(["UTI 1", "UTI 2"] as const).map((uti) => {
              const count = (patients ?? []).filter((p) => (p.uti || "UTI 1") === uti).length;
              return (
                <button
                  key={uti}
                  type="button"
                  onClick={() => setActiveUtiTab(uti)}
                  className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-all ${
                    activeUtiTab === uti
                      ? "bg-white text-hospital-800 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{uti}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Quiet Data Strip */}
        <Card className="bg-white">
          <CardContent className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                <div className="flex items-center gap-4 py-2 md:py-0 md:px-6 md:first:pl-0">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-hospital-50 text-hospital-700">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leitos Ativos em {activeUtiTab}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{filteredPatients.length}</span>
                      <span className="text-xs text-slate-500">
                        {filteredPatients.length === 0 ? "Nenhum internado nesta UTI" : "Pacientes monitorados"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-2 md:py-0 md:px-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-hospital-50 text-hospital-700">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Médio Global</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {withBalance.length ? formatMl(averageBalance) : "—"}
                      </span>
                      <span className="text-xs text-slate-500">Com registros hoje</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-2 md:py-0 md:px-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alertas Clínicos</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${alertsCount > 0 ? "text-status-critical-fg" : "text-slate-900"}`}>
                        {alertsCount}
                      </span>
                      <span className="text-xs text-slate-500">Requerem atenção assistencial</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dominant Reading Chart & Clinical List */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Entradas vs. Saídas por Leito ({activeUtiTab})</CardTitle>
              <CardDescription>Volume acumulado em 24h ordenado por leito na unidade {activeUtiTab}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : chartData.length === 0 ? (
                <div className="grid h-72 place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Nenhum registro hídrico lançado para {activeUtiTab} hoje.
                </div>
              ) : (
                <div className="h-72" role="img" aria-label={`Gráfico de barras comparando entradas e saídas por leito na ${activeUtiTab}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis unit=" ml" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={64} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                        labelStyle={{ fontWeight: 600, color: "#0b3254" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => (value === "entradas" ? "Entradas" : "Saídas")} />
                      <Bar dataKey="entradas" fill="#1677c8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saidas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pacientes na {activeUtiTab}</CardTitle>
              <CardDescription>Agrupados por leito em ordem sequencial</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Nenhum paciente cadastrado na {activeUtiTab}.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const severity = patient.balance ? severityOf(patient.balance.balance_ml) : null;
                    return (
                      <li key={patient.id} className="flex flex-col gap-3 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-hospital-100/70 px-2 py-0.5 font-mono text-xs font-bold text-hospital-900 border border-hospital-200 shrink-0">
                                {patient.uti || "UTI 1"} · Leito {patient.bed}
                              </span>
                            </div>
                            <p className="truncate font-semibold text-slate-900 mt-1">{patient.full_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Prontuário: <span className="font-mono text-slate-700">{patient.medical_record}</span>
                              {patient.balance && (
                                <>
                                  {" · 24h: "}
                                  <span className="font-semibold text-slate-800">{formatMl(patient.balance.balance_ml)}</span>
                                </>
                              )}
                            </p>
                          </div>
                          {severity ? (
                            <Badge variant={severity} className="shrink-0">
                              <StatusDot variant={severity} />
                              {severityLabel[severity]}
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="shrink-0">Sem registro</Badge>
                          )}
                        </div>
                        {patient.qualitativeRecords && patient.qualitativeRecords.length > 0 && (
                          <div className="mt-1 border-t pt-2">
                            <span className="text-xs font-medium text-muted-foreground">Registros Qualitativos (24h):</span>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {patient.qualitativeRecords.map((r) => (
                                <Badge key={r.id} className="font-semibold" variant="neutral" title={r.notes || ""}>
                                  {formatCategory(r.category)}: {r.qualitative_value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
