"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ClipboardPlus, Droplets, LayoutDashboard, LogOut, Menu, UserPlus, UsersRound, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard, adminOnly: false },
  { href: "/registros", label: "Registros", icon: ClipboardPlus, adminOnly: false },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound, adminOnly: true },
  { href: "/usuarios", label: "Usuários", icon: UserPlus, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    apiFetch("/auth/me")
      .then((user: { role: string }) => setIsAdmin(user.role === "ADMIN"))
      .catch(() => undefined);
  }, []);

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex print:bg-white print:min-h-0">
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

        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
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
    </div>
  );
}
