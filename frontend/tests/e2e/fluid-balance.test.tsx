import { render, screen, waitFor } from "@testing-library/react";
import RecordsPage from "@/app/registros/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("UAT E2E: Fluid Balance Calculation & Qualitative Values", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calculates balance correctly with Medication=100 and Diuresis=+++ (Total=100)", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente UAT 1", bed: "UTI 01", medical_record: "REC-UAT-01" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 301,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "MEDICATION",
              volume_ml: 100,
              occurred_at: "2026-08-06T07:00:00",
              notes: "Dipirona",
              created_at: "2026-08-06T07:00:00",
            },
            {
              id: 302,
              patient_id: 1,
              registered_by_id: 1,
              direction: "OUTPUT",
              category: "URINE",
              volume_ml: null,
              qualitative_value: "+++",
              occurred_at: "2026-08-06T08:00:00",
              notes: null,
              created_at: "2026-08-06T08:00:00",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(await screen.findByDisplayValue("+++")).toBeInTheDocument();
    expect(screen.getAllByText("100 ml").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+100 ml").length).toBeGreaterThan(0);
    expect(screen.getByText(/saldo acumulado:/i)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
  });
});
