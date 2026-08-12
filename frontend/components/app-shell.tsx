"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ClipboardPlus, Droplets, LayoutDashboard, LogOut, Menu, UserPlus, UsersRound, X, KeyRound, User as UserIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";

import { DevToolsHider } from "@/components/devtools-hider";

const navItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard, roles: ["CLINICAL", "ADMIN", "DEVELOPER"] },
  { href: "/registros", label: "Registros", icon: ClipboardPlus, roles: ["CLINICAL", "ADMIN", "DEVELOPER"] },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound, roles: ["CLINICAL", "ADMIN", "DEVELOPER"] },
  { href: "/usuarios", label: "Usuários", icon: UserPlus, roles: ["ADMIN", "DEVELOPER"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ full_name: string; username: string; role: string; name?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role;

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    } else {
      setIsAuthorized(true);
      apiFetch("/auth/me")
        .then((u: any) => setUser(u))
        .catch(() => undefined);
    }
  }, [router]);

  useEffect(() => {
    if (role === "CLINICAL" && pathname === "/usuarios") {
      location.href = "/";
    }
  }, [role, pathname]);

  const items = navItems.filter((item) => role && item.roles.includes(role));

  function linkClass(href: string) {
    const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return cn(
      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-hospital-50 text-hospital-900 font-semibold"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );
  }

  function signOut() {
    sessionStorage.removeItem("access_token");
    location.href = "/login";
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("As novas senhas não coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      if (res.status === 204) {
        setPwdSuccess("Senha atualizada com sucesso!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json().catch(() => null);
        setPwdError(data?.detail || "Erro ao atualizar a senha.");
      }
    } catch (err) {
      setPwdError("Erro de comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleLabel = role === "ADMIN" ? "Administrador" : role === "CLINICAL" ? "Enfermeiro" : role === "DEVELOPER" ? "Desenvolvedor" : "Profissional";

  if (isAuthorized === null) {
    return null; // Bloqueia a renderização do layout até que a autorização seja validada.
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex print:bg-white print:min-h-0">
      <DevToolsHider role={role} />
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-6 lg:flex print:hidden">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-hospital-700 text-white shadow-sm">
              <Droplets className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold leading-tight text-hospital-900">HidroCare</p>
              <p className="text-xs text-slate-500">Painel Assistencial</p>
            </div>
          </Link>

          <nav aria-label="Navegação principal" className="space-y-1">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <item.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-2">
          {user && (
            <div className="px-3 pb-2">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user.full_name || user.name || user.username}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
          )}
          
          <button
            onClick={() => {
              setPwdModalOpen(true);
              setPwdError("");
              setPwdSuccess("");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <KeyRound className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            Alterar Minha Senha
          </button>
          
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden print:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hospital-700 text-white">
              <Droplets className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-hospital-900">HidroCare</p>
              <p className="text-[11px] text-slate-500">Painel Assistencial</p>
            </div>
          </Link>

          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav aria-label="Navegação móvel" className="flex flex-col gap-1 border-t border-slate-200 bg-white p-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
            {user && (
              <div className="px-3 py-2 mt-2 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-800">{user.full_name || user.name || user.username}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
            )}
            <button
              onClick={() => {
                setMobileOpen(false);
                setPwdModalOpen(true);
                setPwdError("");
                setPwdSuccess("");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <KeyRound className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              Alterar Minha Senha
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              Sair da conta
            </button>
          </nav>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 print:p-0">
        <div className={cn("mx-auto", pathname === "/registros" ? "w-full max-w-none" : "max-w-7xl")}>
          {children}
        </div>
      </main>

      {/* Password Change Modal */}
      <Dialog open={pwdModalOpen} onOpenChange={setPwdModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handlePasswordChange}>
            <DialogHeader>
              <DialogTitle>Alterar Minha Senha</DialogTitle>
              <DialogDescription>
                Atualize sua senha de acesso ao sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {pwdError && <Alert variant="error">{pwdError}</Alert>}
              {pwdSuccess && <Alert variant="success">{pwdSuccess}</Alert>}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="current-password">Senha Atual</label>
                <input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-hospital-500 focus:outline-none focus:ring-1 focus:ring-hospital-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="new-password">Nova Senha</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-hospital-500 focus:outline-none focus:ring-1 focus:ring-hospital-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="confirm-password">Confirmar Nova Senha</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-hospital-500 focus:outline-none focus:ring-1 focus:ring-hospital-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-hospital-600 px-4 py-2 text-sm font-medium text-white hover:bg-hospital-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : "Salvar Senha"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
