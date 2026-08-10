import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginPage", () => {
  it("keeps the login submit control available with labelled credentials", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Usuário")).toHaveAttribute("name", "username");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
