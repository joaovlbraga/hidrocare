/**
 * Copyright (c) 2026 João Vitor de Lima Braga. All rights reserved.
 * This software is the confidential and proprietary information of João Vitor de Lima Pellegrini Braga.
 * System: HidroCare
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HidroCare | Balanço Hídrico Editorial Clínico",
  description: "Sistema clínico responsivo para acompanhamento de balanço hídrico e gestão de pacientes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
