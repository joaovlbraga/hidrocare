"use client";

import React from "react";

interface DevToolsHiderProps {
  role: string | null | undefined;
}

export function DevToolsHider({ role }: DevToolsHiderProps) {
  if (role === "DEVELOPER") {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          nextjs-portal,
          [data-nextjs-toast],
          #nextjs-toast,
          [data-next-build-indicator] {
            display: none !important;
            pointer-events: none !important;
          }
        `,
      }}
    />
  );
}
