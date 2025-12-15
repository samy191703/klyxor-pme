// client/src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        // Bouton principal KLYXOR (ex: "Nouveau contrat")
        default:
          "bg-[#2F80ED] text-white shadow-sm hover:bg-[#256FDB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80ED] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",

        // Bouton secondaire / outline (ex: Actualiser, Colonnes, Exporter)
        outline:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80ED] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",

        // Bouton neutre léger (ex: actions dans les cards, secondaire non critique)
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",

        // Bouton danger (ex: supprimer, résilier)
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97373] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",

        // Bouton très discret (ex: icône “Voir”, petites actions)
        ghost:
          "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",

        // Lien (texte cliquable)
        link:
          "bg-transparent text-[#2F80ED] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F80ED] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
