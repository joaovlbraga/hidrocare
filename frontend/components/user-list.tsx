"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  CLINICAL: "Equipe assistencial",
  ADMIN: "Administrador",
  DEVELOPER: "Desenvolvedor",
};

export function UserList() {
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset modal state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((user) => {
        setRole(user.role);
        if (user.role === "ADMIN" || user.role === "DEVELOPER") {
          return apiFetch("/auth/users");
        }
        return Promise.reject("Unauthorized");
      })
      .then((data: User[]) => {
        setUsers(data);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (role !== "ADMIN" && role !== "DEVELOPER") return null;

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 8) {
      setResetMessage({ text: "A senha deve ter ao menos 8 caracteres.", ok: false });
      return;
    }

    setResetSaving(true);
    setResetMessage(null);
    try {
      await apiFetch(`/auth/users/${resetUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: newPassword }),
      });
      setResetMessage({ text: "Senha redefinida com sucesso.", ok: true });
      setTimeout(() => {
        closeResetModal();
      }, 2000);
    } catch (error) {
      setResetMessage({ text: error instanceof Error ? error.message : "Erro ao redefinir senha", ok: false });
    } finally {
      setResetSaving(false);
    }
  }

  function closeResetModal() {
    setResetUser(null);
    setNewPassword("");
    setResetMessage(null);
    setResetSaving(false);
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Usuários do Sistema</h2>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Nome Completo</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">{user.username}</td>
                  <td className="px-4 py-3 text-slate-600">{user.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ROLE_LABELS[user.role] || user.role}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-slate-500 hover:text-slate-900"
                      onClick={() => setResetUser(user)}
                    >
                      <KeyRound className="h-4 w-4 mr-1.5" />
                      Redefinir
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!resetUser} onOpenChange={(open) => !open && closeResetModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-hospital-600" />
              Redefinir Senha — @{resetUser?.username}
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha de acesso para <strong>{resetUser?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
                placeholder="Mínimo 8 caracteres"
                disabled={resetSaving || resetMessage?.ok}
              />
            </div>

            {resetMessage && (
              <Alert variant={resetMessage.ok ? "success" : "error"}>
                {resetMessage.text}
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeResetModal}
                disabled={resetSaving || resetMessage?.ok}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={resetSaving || resetMessage?.ok} loading={resetSaving}>
                Salvar Nova Senha
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
