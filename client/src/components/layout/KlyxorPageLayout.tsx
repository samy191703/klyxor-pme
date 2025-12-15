// client/src/components/layout/KlyxorPageLayout.tsx

import type { ReactNode } from "react";
import Header from "@/components/layout/header";
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
  actions?: (theme: KlyxorThemeTokens) => ReactNode;
  children: (theme: KlyxorThemeTokens) => ReactNode;
};

export function KlyxorPageLayout({
  title,
  subtitle,
  actions,
  children,
}: KlyxorPageLayoutProps) {
  const { user } = useAuth();
  const theme = useKlyxorTheme();

  const {
    isDark,
    toggleTheme,
    cockpitClass,
    primaryText,
    secondaryText,
  } = theme;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1 overflow-auto pb-8 pt-4">
        
        {/* Conteneur PLEIN ÉCRAN */}
        <div className="w-full px-4 lg:px-8 max-w-none">

          {/* Cockpit PLEIN ÉCRAN (plus aucun max-width caché) */}
          <div className={cn("w-full max-w-none", cockpitClass)}>
            
            <PageHeaderKlyxor
              title={
                <span
                  className={cn(
                    "text-xl font-semibold tracking-tight",
                    primaryText,
                  )}
                >
                  {title}
                </span>
              }
              subtitle={
                subtitle ? (
                  <span className={cn("text-sm", secondaryText)}>
                    {subtitle}
                  </span>
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
                        : "border-slate-300 bg-white text-slate-700",
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
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                    )}
                    onClick={toggleTheme}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>

                  {actions && actions(theme)}
                </div>
              }
            />

            {children(theme)}
          </div>
        </div>
      </main>
    </div>
  );
}
