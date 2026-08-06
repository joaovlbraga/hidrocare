import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordsPage from "@/app/registros/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("UAT E2E: Hostile Input UI Validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("handles emojis and qualitative symbols in cell inputs cleanly without crashes", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Paciente Hostil UI", bed: "UTI 04", medical_record: "REC-HOST-UI" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({ fluids: [] });
      }
      if (url === "/balances/records") {
        return Promise.resolve({ id: 601 });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(await screen.findByText(/prontuário hídrico da uti/i)).toBeInTheDocument();

    const inputs = await screen.findAllByPlaceholderText("—");
    const firstInput = inputs[0];

    // Enter qualitative cross symbol ++
    fireEvent.change(firstInput, { target: { value: "++" } });
    fireEvent.blur(firstInput);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/balances/records",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"volume_ml":"++"'),
        })
      );
    });
  });
});
