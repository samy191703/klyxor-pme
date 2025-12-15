// client/src/components/layout/PageHeaderKlyxor.tsx

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageHeaderKlyxorProps = {
  /** Titre principal (ReactNode pour permettre span, icônes, etc.) */
  title: ReactNode;

  /** Sous-titre optionnel (ReactNode) */
  subtitle?: ReactNode;

  /** Zone d’actions à droite (badges, CTA, toggles, etc.) */
  actions?: ReactNode;

  /** Classes additionnelles pour le wrapper */
  className?: string;

  /** Classes additionnelles pour la zone texte (gauche) */
  leftClassName?: string;

  /** Classes additionnelles pour la zone actions (droite) */
  actionsClassName?: string;
};

/**
 * Header de page standard Klyxor (cockpit).
 * - Colonne gauche : titre + sous-titre
 * - Colonne droite : actions
 * - Responsive et robuste (wrapping contrôlé, min-w-0)
 */
export function PageHeaderKlyxor({
  title,
  subtitle,
  actions,
  className,
  leftClassName,
  actionsClassName,
}: PageHeaderKlyxorProps) {
  return (
    <header
      className={cn(
        "w-full flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className={cn("min-w-0 flex-1", leftClassName)}>
        <div className="min-w-0 leading-tight">{title}</div>
        {subtitle ? (
          <div className="mt-1 min-w-0 text-slate-600">{subtitle}</div>
        ) : null}
      </div>

      {actions ? (
        <div
          className={cn(
            "shrink-0 flex items-center gap-2 sm:justify-end",
            actionsClassName
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeaderKlyxor;
