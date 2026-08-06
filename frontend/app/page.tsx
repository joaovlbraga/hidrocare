"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Droplets, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api";

type Patient = { id: number; full_name: string; bed: string; medical_record: string; is_admitted: boolean };
type DailyBalance = { patient_id: number; date: string; input_ml: number; output_ml: number; balance_ml: number; status: string };
type PatientBalance = Patient & { balance: DailyBalance | null };

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

export default function DashboardPage() {
  const [patients, setPatients] = useState<PatientBalance[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      try {
        const list: Patient[] = await apiFetch("/patients");
        const withBalances = await Promise.all(
          list.map(async (patient) => {
            try {
              const balance: DailyBalance = await apiFetch(`/balances/patients/${patient.id}/daily?target_date=${todayIso()}`);
              return { ...patient, balance };
            } catch {
              return { ...patient, balance: null };
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
  }, []);

  const loading = patients === null;

  const sorted = useMemo(() => {
    if (!patients) return [];
    const rank = { critical: 0, warning: 1, stable: 2 } as const;
    return [...patients].sort((a, b) => {
      const sa = a.balance ? rank[severityOf(a.balance.balance_ml)] : 3;
      const sb = b.balance ? rank[severityOf(b.balance.balance_ml)] : 3;
      return sa - sb;
    });
  }, [patients]);

  const withBalance = (patients ?? []).filter((p): p is PatientBalance & { balance: DailyBalance } => p.balance !== null);
  const alertsCount = withBalance.filter((p) => severityOf(p.balance.balance_ml) !== "stable").length;
  const averageBalance = withBalance.length
    ? Math.round(withBalance.reduce((sum, p) => sum + p.balance.balance_ml, 0) / withBalance.length)
    : 0;

  const chartData = withBalance.map((p) => ({
    label: p.bed,
    entradas: p.balance.input_ml,
    saidas: p.balance.output_ml,
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Visão geral do plantão"
          description={`Saldo hídrico acumulado de hoje · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`}
        />

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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pacientes Monitorados</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{patients?.length ?? 0}</span>
                      <span className="text-xs text-slate-500">
                        {patients?.length === 0 ? "Nenhum internado" : `${alertsCount} requerem atenção`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-2 md:py-0 md:px-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-hospital-50 text-hospital-700">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Médio (Hoje)</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {withBalance.length ? formatMl(averageBalance) : "—"}
                      </span>
                      <span className="text-xs text-slate-500">Com registros no plantão</span>
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
                      <span className="text-xs text-slate-500">Fora da faixa de referência</span>
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
              <CardTitle>Entradas vs. Saídas por Leito</CardTitle>
              <CardDescription>Comparativo do volume acumulado (ml) no plantão atual</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : chartData.length === 0 ? (
                <div className="grid h-72 place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Nenhum registro hídrico lançado hoje.
                </div>
              ) : (
                <div className="h-72" role="img" aria-label="Gráfico de barras comparando entradas e saídas por paciente hoje">
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
              <CardTitle>Status Clínico dos Pacientes</CardTitle>
              <CardDescription>Ordenado por prioridade de atenção assistencial</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : sorted.length === 0 ? (
                <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Nenhum paciente internado no momento.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {sorted.map((patient) => {
                    const severity = patient.balance ? severityOf(patient.balance.balance_ml) : null;
                    return (
                      <li key={patient.id} className="flex items-center justify-between gap-3 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{patient.full_name}</p>
                          <p className="text-xs text-slate-500">
                            Leito: <span className="font-semibold text-slate-700">{patient.bed}</span>
                            {patient.balance && (
                              <>
                                {" · Saldo: "}
                                <span className="font-medium text-slate-700">{formatMl(patient.balance.balance_ml)}</span>
                              </>
                            )}
                          </p>
                        </div>
                        {severity ? (
                          <Badge variant={severity}>
                            <StatusDot variant={severity} />
                            {severityLabel[severity]}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Sem registro</Badge>
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
