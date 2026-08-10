"use client";

import { FormEvent, useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FormPanel } from "@/components/form-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

export default function UsersPage() {
  const [role, setRole] = useState("CLINICAL");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password"));
    if (password.length < 8) return setMessage({ text: "A senha deve ter ao menos 8 caracteres.", ok: false });

    setSaving(true);
    try {
      await apiFetch("/auth/users", {
        method: "POST",
        body: JSON.stringify({ username: data.get("username"), full_name: data.get("full_name"), email: data.get("email"), password, role }),
      });
      form.reset();
      setRole("CLINICAL");
      setMessage({ text: "Usuário criado e salvo no banco de dados.", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Erro ao criar usuário", ok: false });
    } finally {
      setSaving(false);
    }
  }

  const asideContent = (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2 text-hospital-800">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Segurança e RBAC</CardTitle>
        </div>
        <CardDescription>Perfis e níveis de acesso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          <strong className="text-slate-800">Equipe assistencial:</strong> Permite visualizar o dashboard e registrar balanço hídrico.
        </p>
        <p>
          <strong className="text-slate-800">Administrador:</strong> Acesso completo, incluindo cadastro de pacientes e gestão de usuários.
        </p>
        <p>
          <strong className="text-slate-800">Desenvolvedor:</strong> Acesso técnico voltado para operações de engenharia e ferramentas de desenvolvimento.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <AppShell>
      <FormPanel
        title="Criar usuário"
        description="Cadastre os acessos profissionais da equipe. Esta operação é restrita a administradores."
        aside={asideContent}
      >
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-4 pb-4 border-b border-slate-100">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">1. Identificação do Profissional</h2>
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" required name="full_name" className="mt-1.5" placeholder="Nome completo do profissional" />
            </div>

            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" required name="username" className="mt-1.5" placeholder="usuario.sobrenome" />
            </div>

            <div>
              <Label htmlFor="email">E-mail profissional</Label>
              <Input
                id="email"
                required
                name="email"
                type="email"
                className="mt-1.5"
                placeholder="profissional@hospital.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">2. Credenciais e Perfil de Acesso</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Senha inicial</Label>
                <Input id="password" required name="password" type="password" minLength={8} className="mt-1.5" placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <Label htmlFor="role">Perfil de Acesso</Label>
                <input type="hidden" name="role" value={role} />
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINICAL">Enfermeiros</SelectItem>
                    <SelectItem value="ADMIN">Administradores</SelectItem>
                    <SelectItem value="DEVELOPER">Desenvolvedores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Alert variant="info">Senhas são armazenadas somente como hash Bcrypt no banco de dados.</Alert>

          {message && <Alert variant={message.ok ? "success" : "error"}>{message.text}</Alert>}

          <Button type="submit" disabled={saving} loading={saving} className="w-full" size="lg">
            {!saving && <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Criando..." : "Criar usuário"}
          </Button>
        </form>
      </FormPanel>
    </AppShell>
  );
}
