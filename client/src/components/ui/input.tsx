// client/src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Input KLYXOR – style SaaS clair, cohérent avec les cards
 *
 * - Fond blanc
 * - Bordure gris clair
 * - Coins arrondis
 * - Placeholder gris
 * - Focus avec halo bleu KLYXOR
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white",
          "px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
          "shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80ED] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
