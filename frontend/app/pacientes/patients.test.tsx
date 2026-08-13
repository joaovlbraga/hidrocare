import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PatientsPage from "@/app/pacientes/page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("PatientsPage with Convênio", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("submits patient form including health insurance field", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.resolve({ username: "admin", role: "ADMIN" });
      if (url === "/patients") return Promise.resolve([]);
      return Promise.resolve({});
    });

    render(<PatientsPage />);

    expect(screen.getByLabelText(/convênio/i)).toHaveValue("SUS");

    fireEvent.change(screen.getByLabelText(/prontuário/i), { target: { value: "REC123" } });
    
    // For Radix Select, we need to click the trigger and then the item
    const utiTrigger = screen.getByRole("combobox", { name: /unidade uti/i });
    fireEvent.click(utiTrigger);
    fireEvent.click(screen.getByRole("option", { name: "UTI 1" }));

    const bedTrigger = screen.getByRole("combobox", { name: /leito/i });
    fireEvent.click(bedTrigger);
    fireEvent.click(screen.getByRole("option", { name: "01" }));

    fireEvent.change(screen.getByLabelText(/convênio/i), { target: { value: "Unimed" } });
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "João Silva" } });
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), { target: { value: "1990-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /cadastrar paciente/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/patients",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            medical_record: "REC123",
            uti: "UTI 1",
            bed: "01",
            health_insurance: "Unimed",
            full_name: "João Silva",
            birth_date: "1990-01-01",
          }),
        })
      );
      expect(screen.getByText("Paciente cadastrado com sucesso.")).toBeInTheDocument();
    });
  });

  it("renders active patients displaying insurance details and handles archiving", async () => {
    const mockPatients = [
      { id: 1, full_name: "Maria Santos", bed: "UTI 02", medical_record: "REC-999", health_insurance: "Bradesco Saúde", is_admitted: true, is_active: true },
    ];

    (apiFetch as any).mockImplementation((url: string, init?: any) => {
      if (url === "/auth/me") return Promise.resolve({ username: "admin", role: "ADMIN" });
      if (url === "/patients" && (!init || !init.method || init.method === "GET")) {
        return Promise.resolve(mockPatients);
      }
      if (url === "/patients/1/archive" && init?.method === "PATCH") {
        return Promise.resolve({ ...mockPatients[0], is_active: false });
      }
      return Promise.resolve([]);
    });

    render(<PatientsPage />);

    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("Bradesco Saúde")).toBeInTheDocument();

    // Click "Dar Alta / Remover" button
    const removeBtn = screen.getByRole("button", { name: /dar alta \/ remover/i });
    fireEvent.click(removeBtn);

    // Confirmation modal should appear
    expect(screen.getByText(/confirmar remoção de paciente/i)).toBeInTheDocument();

    // Click "Confirmar Remoção"
    const confirmBtn = screen.getByRole("button", { name: /confirmar remoção/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/patients/1/archive", expect.objectContaining({ method: "PATCH" }));
      expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
    });
  });
});
