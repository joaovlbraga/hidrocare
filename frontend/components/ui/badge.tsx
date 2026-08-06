import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
  {
    variants: {
      variant: {
        stable: "bg-status-stable-bg text-status-stable-fg ring-status-stable-border",
        warning: "bg-status-warning-bg text-status-warning-fg ring-status-warning-border",
        critical: "bg-status-critical-bg text-status-critical-fg ring-status-critical-border",
        neutral: "bg-slate-100 text-slate-700 ring-slate-200",
        info: "bg-hospital-50 text-hospital-800 ring-hospital-200",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusDot({ variant }: { variant: "stable" | "warning" | "critical" }) {
  const color = { stable: "bg-status-stable-solid", warning: "bg-status-warning-solid", critical: "bg-status-critical-solid" }[variant];
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden="true" />;
}
