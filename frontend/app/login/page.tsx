"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Activity, ShieldCheck, Droplets, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("E-mail ou senha inválidos");
      const { access_token } = await response.json();
      sessionStorage.setItem("access_token", access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Restrained Brand & Assurance Panel */}
        <div className="bg-hospital-900 text-white p-8 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2 text-white">
              <Droplets className="h-6 w-6 text-hospital-300" aria-hidden="true" />
              <span className="font-bold text-lg tracking-tight">HidroCare</span>
            </div>
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Plataforma de Balanço Hídrico Editorial Clínico
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-hospital-200">
              Sistema assistencial para registro rigoroso de entradas e saídas hídricas, classificação contínua de estabilidade e acompanhamento de pacientes em leito.
            </p>
          </div>

          <div className="mt-12 space-y-4 text-xs text-hospital-200 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-status-stable-solid" aria-hidden="true" />
              <span>Acesso restrito a profissionais de saúde autorizados.</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-hospital-300" aria-hidden="true" />
              <span>Criptografia Bcrypt e tokens JWT de curta duração.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Compact Form Surface */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Entrar no sistema</h1>
            <p className="mt-1 text-sm text-slate-600">Insira suas credenciais de acesso profissional</p>
          </div>

          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="email"
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="pl-9"
                  placeholder="profissional@hospital.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative mt-1">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="password"
                  required
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {!loading && <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
