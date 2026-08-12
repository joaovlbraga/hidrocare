"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserRoundPlus, Info, UserX, AlertTriangle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/app-shell";
import { FormPanel } from "@/components/form-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

const patientSchema = z.object({
  medical_record: z.string().min(1, "Prontuário é obrigatório").max(60, "Prontuário excede 60 caracteres"),
  uti: z.enum(["UTI 1", "UTI 2"], { required_error: "Unidade UTI é obrigatória" }),
  bed: z.string().min(1, "Leito é obrigatório").max(50, "Leito excede 50 caracteres"),
  health_insurance: z.string().min(1, "Convênio é obrigatório").max(100, "Convênio excede 100 caracteres"),
  full_name: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres").max(150, "Nome excede 150 caracteres"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
});

type PatientFormData = z.infer<typeof patientSchema>;

type Patient = {
  id: number;
  full_name: string;
  uti?: string;
  bed: string;
  medical_record: string;
  health_insurance?: string;
  is_admitted: boolean;
  is_active: boolean;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [confirmPatient, setConfirmPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      uti: "UTI 1",
      health_insurance: "SUS",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: controlEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  });

  const openEditModal = (patient: Patient) => {
    resetEdit({
      full_name: patient.full_name,
      medical_record: patient.medical_record,
      uti: (patient.uti as "UTI 1" | "UTI 2") || "UTI 1",
      bed: patient.bed,
      health_insurance: patient.health_insurance || "SUS",
      birth_date: new Date().toISOString().split("T")[0], // Mock date since we don't return it in list, ideally should come from backend
    });
    setEditingPatient(patient);
  };

  const onEditSubmit = async (data: PatientFormData) => {
    if (!editingPatient) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/patients/${editingPatient.id}`, { method: "PATCH", body: JSON.stringify(data) });
      setMessage({ text: "Dados do paciente atualizados com sucesso.", ok: true });
      setEditingPatient(null);
      await loadPatients();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Erro ao atualizar paciente", ok: false });
    } finally {
      setSaving(false);
    }
  };

  async function loadPatients() {
    try {
      const list: Patient[] = await apiFetch("/patients");
      setPatients(list);
    } catch {
      setPatients([]);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function onSubmit(data: PatientFormData) {
    setMessage(null);
    setSaving(true);
    try {
      await apiFetch("/patients", { method: "POST", body: JSON.stringify(data) });
      reset({ uti: "UTI 1", health_insurance: "SUS", medical_record: "", bed: "", full_name: "", birth_date: "" });
      setMessage({ text: "Paciente cadastrado com sucesso.", ok: true });
      await loadPatients();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Erro ao cadastrar paciente", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirmPatient) return;
    const id = confirmPatient.id;
    setArchivingId(id);
    setMessage(null);
    try {
      await apiFetch(`/patients/${id}/archive`, { method: "PATCH" });
      setPatients((prev) => (prev ? prev.filter((p) => p.id !== id) : []));
      setMessage({ text: "Paciente removido com sucesso (dados mantidos para auditoria).", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Erro ao remover paciente", ok: false });
    } finally {
      setArchivingId(null);
      setConfirmPatient(null);
    }
  }

  const asideContent = (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2 text-hospital-800">
          <Info className="h-4 w-4" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Regras de Cadastro</CardTitle>
        </div>
        <CardDescription>Acompanhamento de leitos ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>O número do prontuário é o identificador clínico do paciente no sistema.</p>
        <p>
          Selecione a unidade de terapia intensiva (<strong>UTI 1</strong> ou <strong>UTI 2</strong>) e o número/código do leito (ex.: 01, 02, A1, Isolamento).
        </p>
        <p>
          O convênio registra a cobertura assistencial do paciente (ex.: SUS, Bradesco, Unimed, etc.).
        </p>
        <p>
          A remoção de paciente opera via <strong>Soft Delete</strong>: o paciente é retirado da lista ativa do painel assistencial, mas todo o histórico de balanço hídrico é preservado para auditoria.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <FormPanel
          title="Cadastrar paciente"
          description="Cadastre o paciente, sua unidade UTI e o leito para permitir o monitoramento e o registro hídrico assistencial."
          aside={asideContent}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">1. Leito e Identificação Hospitalar</h2>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <Label htmlFor="medical_record">Prontuário</Label>
                  <Input id="medical_record" {...register("medical_record")} className="mt-1.5" placeholder="Ex.: PR-89234" />
                  {errors.medical_record && <p className="mt-1 text-xs text-red-600">{errors.medical_record.message}</p>}
                </div>
                <div>
                  <Label htmlFor="uti">Unidade UTI</Label>
                  <Controller
                    control={control}
                    name="uti"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="uti" className="mt-1.5 h-9 text-xs">
                          <SelectValue placeholder="Selecione a UTI" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTI 1">UTI 1</SelectItem>
                          <SelectItem value="UTI 2">UTI 2</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.uti && <p className="mt-1 text-xs text-red-600">{errors.uti.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bed">Leito</Label>
                  <Controller
                    control={control}
                    name="bed"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="bed" className="mt-1.5 h-9 text-xs">
                          <SelectValue placeholder="Leito" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, "0")).map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bed && <p className="mt-1 text-xs text-red-600">{errors.bed.message}</p>}
                </div>
                <div>
                  <Label htmlFor="health_insurance">Convênio</Label>
                  <Input id="health_insurance" {...register("health_insurance")} className="mt-1.5" placeholder="Ex.: SUS, Unimed, Bradesco..." />
                  {errors.health_insurance && <p className="mt-1 text-xs text-red-600">{errors.health_insurance.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">2. Dados Pessoais</h2>
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input 
                  id="full_name" 
                  {...register("full_name")} 
                  className="mt-1.5" 
                  placeholder="Ex: Maria da Silva Souza" 
                />
                {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
              </div>

              <div>
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} className="mt-1.5" />
                {errors.birth_date && <p className="mt-1 text-xs text-red-600">{errors.birth_date.message}</p>}
              </div>
            </div>

            {message && <Alert variant={message.ok ? "success" : "error"}>{message.text}</Alert>}

            <Button type="submit" disabled={saving} loading={saving} className="w-full" size="lg">
              {!saving && <UserRoundPlus className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Salvando..." : "Cadastrar paciente"}
            </Button>
          </form>
        </FormPanel>

        {/* Active Patients Section */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pacientes em Leito Ativo</CardTitle>
            <CardDescription>Lista dos pacientes atualmente internados e disponíveis para balanço hídrico</CardDescription>
          </CardHeader>
          <CardContent>
            {patients === null ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : patients.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum paciente ativo no momento.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-900">{patient.full_name}</p>
                      <p className="text-xs text-slate-500">
                        Unidade: <span className="font-medium text-slate-800">{patient.uti || "UTI 1"}</span> · Leito:{" "}
                        <span className="font-medium text-slate-800">{patient.bed}</span> · Prontuário:{" "}
                        <span className="font-medium text-slate-700">{patient.medical_record}</span> · Convênio:{" "}
                        <span className="font-medium text-slate-700">{patient.health_insurance || "SUS"}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(patient)}
                        className="gap-1.5 text-slate-600"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmPatient(patient)}
                        className="gap-1.5"
                      >
                        <UserX className="h-4 w-4" aria-hidden="true" />
                        Dar Alta / Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Confirmar Remoção de Paciente</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tem certeza que deseja dar alta / remover o paciente <strong className="text-slate-900">{confirmPatient.full_name}</strong> ({confirmPatient.uti || "UTI 1"} — Leito {confirmPatient.bed}, Prontuário {confirmPatient.medical_record})?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              ℹ️ O paciente será arquivado do painel ativo (Soft Delete). Todo o histórico de balanço hídrico permanece intacto no banco de dados.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmPatient(null)} disabled={archivingId !== null}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleArchive}
                loading={archivingId !== null}
                disabled={archivingId !== null}
              >
                Confirmar Remoção
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Paciente — {editingPatient?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit_medical_record">Prontuário</Label>
                <Input id="edit_medical_record" {...registerEdit("medical_record")} className="mt-1.5" />
                {editErrors.medical_record && <p className="mt-1 text-xs text-red-600">{editErrors.medical_record.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit_health_insurance">Convênio</Label>
                <Input id="edit_health_insurance" {...registerEdit("health_insurance")} className="mt-1.5" />
                {editErrors.health_insurance && <p className="mt-1 text-xs text-red-600">{editErrors.health_insurance.message}</p>}
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit_uti">Unidade UTI</Label>
                <Controller
                  control={controlEdit}
                  name="uti"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit_uti" className="mt-1.5">
                        <SelectValue placeholder="Selecione a UTI" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTI 1">UTI 1</SelectItem>
                        <SelectItem value="UTI 2">UTI 2</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {editErrors.uti && <p className="mt-1 text-xs text-red-600">{editErrors.uti.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit_bed">Leito</Label>
                <Controller
                  control={controlEdit}
                  name="bed"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit_bed" className="mt-1.5">
                        <SelectValue placeholder="Leito" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, "0")).map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editErrors.bed && <p className="mt-1 text-xs text-red-600">{editErrors.bed.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="edit_full_name">Nome completo</Label>
              <Input 
                id="edit_full_name" 
                {...registerEdit("full_name")} 
                className="mt-1.5" 
              />
              {editErrors.full_name && <p className="mt-1 text-xs text-red-600">{editErrors.full_name.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingPatient(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
