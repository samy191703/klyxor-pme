import type { ReactNode } from "react";

type PageHeaderKlyxorProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeaderKlyxor({
  title,
  subtitle,
  actions,
}: PageHeaderKlyxorProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Bloc Titre + Sous-titre */}
        <div>
          <h1 className="text-3xl font-bold text-kly-text-primary tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-kly-text-secondary mt-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions (boutons à droite) */}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
