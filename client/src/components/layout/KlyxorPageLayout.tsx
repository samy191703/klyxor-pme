// client/src/components/layout/KlyxorPageLayout.tsx

import type { ReactNode } from "react";
import { PageHeaderKlyxor } from "@/components/layout/PageHeaderKlyxor";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useKlyxorTheme } from "@/hooks/useKlyxorTheme";
import { Moon, Sun } from "lucide-react";

export type KlyxorThemeTokens = ReturnType<typeof useKlyxorTheme>;

type KlyxorPageLayoutProps = {
  title: ReactNode;
  subtitle?: ReactNode;

  /** Actions à droite du header (CTA page) */
  actions?: (theme: KlyxorThemeTokens) => ReactNode;

  /** Barre optionnelle sous le header (filtres, recherche, etc.) */
  toolbar?: (theme: KlyxorThemeTokens) => ReactNode;

  /**
   * Contenu de page
   * - soit un ReactNode simple (pages existantes)
   * - soit une fonction (theme) => ReactNode (pages avancées)
   */
  children: ReactNode | ((theme: KlyxorThemeTokens) => ReactNode);

  /** Permet de passer en pleine largeur si nécessaire */
  fullWidth?: boolean;
};

export function KlyxorPageLayout({
  title,
  subtitle,
  actions,
  toolbar,
  children,
  fullWidth = false,
}: KlyxorPageLayoutProps) {
  const { user } = useAuth();
  const theme = useKlyxorTheme();

  const { isDark, toggleTheme, cockpitClass, primaryText, secondaryText } = theme;

  const renderChildren = () => {
    if (typeof children === "function") {
      return (children as (t: KlyxorThemeTokens) => ReactNode)(theme);
    }
    return children;
  };

  return (
    <div className={cn("w-full", cockpitClass)}>
      <div
        className={cn(
          "w-full px-4 lg:px-8 py-4 lg:py-6",
          fullWidth ? "max-w-none" : "max-w-[1600px] mx-auto"
        )}
      >
        <PageHeaderKlyxor
          title={
            <span className={cn("text-xl font-semibold tracking-tight", primaryText)}>
              {title}
            </span>
          }
          subtitle={
            subtitle ? (
              <span className={cn("text-sm", secondaryText)}>{subtitle}</span>
            ) : null
          }
          actions={
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "px-2.5 py-1 text-xs font-medium",
                  isDark
                    ? "border-slate-500/60 bg-slate-900/70 text-slate-100"
                    : "border-slate-300 bg-white text-slate-700"
                )}
              >
                {user?.role || "Utilisateur"}
              </Badge>

              <Button
                size="icon"
                variant="outline"
                className={cn(
                  "h-8 w-8 border text-xs",
                  isDark
                    ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                )}
                onClick={toggleTheme}
                aria-label="Basculer thème"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {actions ? actions(theme) : null}
            </div>
          }
        />

        {toolbar ? <div className="mt-4">{toolbar(theme)}</div> : null}

        <div className="mt-4">{renderChildren()}</div>
      </div>
    </div>
  );
}

export default KlyxorPageLayout;
