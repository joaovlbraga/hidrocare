import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ role: "CLINICAL" }),
}));

describe("AppShell", () => {
  it("hides administrative links from clinical users", async () => {
    render(
      <AppShell>
        <p>Conteúdo</p>
      </AppShell>
    );
    expect(await screen.findByRole("link", { name: /registros/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
  });
});
