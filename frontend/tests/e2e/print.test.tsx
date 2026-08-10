import { render, screen } from "@testing-library/react";
import RecordsPage from "@/app/registros/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("UAT E2E: Print Layout Integrity & 15+ Itemized Medications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders 15 long medication infusions pre-wrapped without truncation", async () => {
    const medList = Array.from({ length: 15 }, (_, i) => ({
      id: 500 + i,
      patient_id: 1,
      registered_by_id: 1,
      direction: "INPUT",
      category: "MEDICATION",
      volume_ml: 10 + i,
      occurred_at: "2026-08-06T07:00:00",
      notes: `Medicamento Complexo de Longo Nome em Infusão Contínua de UTI #${i + 1}`,
      created_at: "2026-08-06T07:00:00",
    }));

    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ username: "test.user", role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente Impressão UAT", bed: "UTI 03", medical_record: "REC-PRINT-01" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({ fluids: medList });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);
    
    await new Promise((r) => setTimeout(r, 1000));
    console.log(document.body.innerHTML);

    expect(
      await screen.findByText((content) =>
        content.includes("Medicamento Complexo de Longo Nome em Infusão Contínua de UTI #1 (10 ml)") &&
        content.includes("Medicamento Complexo de Longo Nome em Infusão Contínua de UTI #15 (24 ml)")
      )
    ).toBeInTheDocument();

    // Verify signature block element presence
    expect(screen.getByText(/assinatura e carimbo do profissional/i)).toBeInTheDocument();
  });

  it("renders authenticated professional full name in printed signature footer", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ username: "ana.paula", full_name: "Dra. Ana Paula", role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente Teste", bed: "UTI 01", medical_record: "REC01" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({ fluids: [] });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(
      await screen.findByText((_, element) => element?.tagName.toLowerCase() === "p" && element?.textContent?.includes("Dra. Ana Paula") === true)
    ).toBeInTheDocument();
    expect(screen.queryByText(/enfermagem uti hidrocare/i)).not.toBeInTheDocument();
  });

  it("renders fallback 'Profissional Não Identificado' when unauthenticated", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.reject(new Error("Unauthorized"));
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente Teste", bed: "UTI 01", medical_record: "REC01" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({ fluids: [] });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(await screen.findByText(/profissional não identificado/i)).toBeInTheDocument();
    expect(screen.queryByText(/enfermagem uti hidrocare/i)).not.toBeInTheDocument();
  });
});
