import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";
import { describe, it, expect } from "vitest";

describe("PageHeader", () => {
  it("exposes one accessible page heading and its supporting copy", () => {
    render(<PageHeader title="Registrar balanço hídrico" description="Registre ganhos e perdas." />);
    expect(screen.getByRole("heading", { name: "Registrar balanço hídrico" })).toBeInTheDocument();
    expect(screen.getByText("Registre ganhos e perdas.")).toBeInTheDocument();
  });
});
