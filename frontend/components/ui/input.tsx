import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hospital-500 focus-visible:border-hospital-500",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        "aria-[invalid=true]:border-status-critical-border aria-[invalid=true]:ring-status-critical-solid",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
