import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordsPage from "@/app/registros/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("RecordsPage ICU Data Grid & Print Layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders patient selector, date input, print button, and 24-hour ICU shift grid headers", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") {
        return Promise.resolve({ id: 1, username: "nurse.test", full_name: "Nurse Test", role: "CLINICAL" });
      }
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Maria Silva", bed: "UTI 01", medical_record: "REC123", health_insurance: "SUS" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 10,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "IV_HYDRATION",
              volume_ml: "250",
              occurred_at: "2026-08-05T07:00:00",
              notes: null,
              created_at: "2026-08-05T07:00:00",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(await screen.findByText(/prontuário hídrico da uti/i)).toBeInTheDocument();
    const printBtns = await screen.findAllByRole("button", { name: /imprimir/i });
    expect(printBtns.length).toBeGreaterThan(0);
    const ganhosHeaders = await screen.findAllByText(/ganhos \(entradas\)/i);
    expect(ganhosHeaders[0]).toBeInTheDocument();
    expect(screen.getByText(/perdas \(saídas\)/i)).toBeInTheDocument();
    expect(screen.getByText("07:00")).toBeInTheDocument();
    expect(screen.getByText("06:00")).toBeInTheDocument();
  });

  it("triggers window.print when print button is clicked", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Maria Silva", bed: "UTI 01", medical_record: "REC123" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({ fluids: [] });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    const printBtns = await screen.findAllByRole("button", { name: /imprimir/i });
    fireEvent.click(printBtns[0]);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("triggers fluid record PATCH when editing single cell input", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Maria Silva", bed: "UTI 01", medical_record: "REC123" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 10,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "IV_HYDRATION",
              volume_ml: "250",
              occurred_at: "2026-08-05T07:00:00",
              notes: null,
              created_at: "2026-08-05T07:00:00",
            },
          ],
        });
      }
      if (url === "/balances/records/10") {
        return Promise.resolve({ id: 10, volume_ml: "300" });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    const ganhosHeaders = await screen.findAllByText(/ganhos \(entradas\)/i);
    expect(ganhosHeaders[0]).toBeInTheDocument();
    const inputs = screen.getAllByDisplayValue("250");
    const ivInput = inputs[0];
    fireEvent.change(ivInput, { target: { value: "300" } });
    fireEvent.blur(ivInput);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/balances/records/10",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ volume_ml: "300" }),
        })
      );
    });
  });

  it("renders itemized medication notes and volumes in print view mode", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Maria Silva", bed: "UTI 01", medical_record: "REC123" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 101,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "MEDICATION",
              volume_ml: "10",
              occurred_at: "2026-08-05T07:00:00",
              notes: "Noradrenalina",
              created_at: "2026-08-05T07:00:00",
            },
            {
              id: 102,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "MEDICATION",
              volume_ml: "250",
              occurred_at: "2026-08-05T07:00:00",
              notes: "Soro Fisiológico 0.9%",
              created_at: "2026-08-05T07:00:00",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);

    expect(await screen.findByText((content) => content.includes("Noradrenalina (10 ml)") && content.includes("Soro Fisiológico 0.9% (250 ml)"))).toBeInTheDocument();
  });

  it("supports qualitative measurements ++ without NaN calculations", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ role: "CLINICAL" });
      if (url === "/patients") {
        return Promise.resolve([
          { id: 1, full_name: "Maria Silva", bed: "UTI 01", medical_record: "REC123" },
        ]);
      }
      if (url.includes("/balances/patients")) {
        return Promise.resolve({
          fluids: [
            {
              id: 201,
              patient_id: 1,
              registered_by_id: 1,
              direction: "OUTPUT",
              category: "URINE",
              qualitative_value: "++",
              volume_ml: null,
              occurred_at: "2026-08-05T07:00:00",
              notes: null,
              created_at: "2026-08-05T07:00:00",
            },
            {
              id: 202,
              patient_id: 1,
              registered_by_id: 1,
              direction: "INPUT",
              category: "IV_HYDRATION",
              volume_ml: "500",
              occurred_at: "2026-08-05T07:00:00",
              notes: null,
              created_at: "2026-08-05T07:00:00",
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<RecordsPage />);
    
    await new Promise((r) => setTimeout(r, 1000));


    expect(await screen.findByDisplayValue("++")).toBeInTheDocument();
    expect(screen.getAllByText("500 ml").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+500 ml").length).toBeGreaterThan(0);
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
  });
});
