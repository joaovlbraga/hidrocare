import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordsPage from "@/app/registros/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("UAT E2E: Concurrency & Multi-click Idempotency", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("handles rapid single cell save triggers without duplicate network mutations", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ username: "test.user", role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente Concorrência UI", bed: "UTI 02", medical_record: "REC-CONC-UI" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 401,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "IV_HYDRATION",
              volume_ml: 500,
              occurred_at: "2026-08-06T07:00:00",
              notes: null,
              created_at: "2026-08-06T07:00:00",
            },
          ],
        });
      }
      if (url === "/balances/records/401") {
        return Promise.resolve({ id: 401, volume_ml: 500 });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    const inputs = await screen.findAllByDisplayValue("500");
    const input = inputs[0];

    // Trigger 5 rapid blurs with same value
    for (let i = 0; i < 5; i++) {
      fireEvent.blur(input);
    }

    // Since value didn't change (500 -> 500), handleFluidCellSave early-returns without network calls
    await waitFor(() => {
      const patchCalls = (apiFetch as any).mock.calls.filter((call: any[]) => call[0] === "/balances/records/401");
      expect(patchCalls.length).toBe(0);
    });
  });
});
