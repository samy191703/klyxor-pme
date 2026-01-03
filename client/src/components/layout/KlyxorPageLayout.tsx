// client/src/components/layout/KlyxorPageLayout.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KlyxorPageLayoutProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: () => ReactNode;
  children: () => ReactNode;
  className?: string;
};

/**
 * KlyxorPageLayout – Page header + container
 * - Le header global (sidebar/topbar) est géré par AppLayout
 * - Ici : titre + sous-titre + actions + contenu
 */
export function KlyxorPageLayout({
  title,
  subtitle,
  actions,
  children,
  className,
}: KlyxorPageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-6",
        className
      )}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions()}</div> : null}
      </div>

      {children()}
    </div>
  );
}
