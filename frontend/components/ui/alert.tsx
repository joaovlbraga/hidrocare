import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const alertVariants = cva("flex items-start gap-2.5 rounded-md p-3 text-sm animate-fade-in", {
  variants: {
    variant: {
      success: "bg-status-stable-bg text-status-stable-fg",
      warning: "bg-status-warning-bg text-status-warning-fg",
      error: "bg-status-critical-bg text-status-critical-fg",
      info: "bg-hospital-50 text-hospital-900",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { success: CheckCircle2, warning: AlertTriangle, error: XCircle, info: Info };

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
