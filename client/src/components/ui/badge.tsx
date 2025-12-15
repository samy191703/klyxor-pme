// client/src/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge KLYXOR – style SaaS premium
 *
 * Variants (compatibles avec le code existant) :
 * - default      → bleu Klyxor (ex: Actif)
 * - secondary    → bleu/gris soft (ex: À valider, Clôturé)
 * - outline      → neutre (ex: Brouillon)
 * - destructive  → rouge soft (ex: Résilié)
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Bleu Klyxor plein (pour les états positifs/confirmés)
        default:
          "bg-[#2F80ED] text-white border-transparent shadow-sm",

        // Soft pill gris/bleu (pour les états “à suivre” / neutres)
        secondary:
          "bg-slate-100 text-slate-800 border-transparent",

        // Variante neutre (brouillon, info générique)
        outline:
          "bg-transparent text-slate-700 border-slate-300",

        // Rouge soft (erreurs, résilié, incident)
        destructive:
          "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
