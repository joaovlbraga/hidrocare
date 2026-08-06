import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hospital-500 focus-visible:border-hospital-500",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
