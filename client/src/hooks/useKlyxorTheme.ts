// client/src/hooks/useKlyxorTheme.ts

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Hook de thème Klyxor utilisé par le Dashboard ET par les autres pages.
 * Il fournit :
 * - isDark / toggleTheme
 * - les classes de base (cockpit, cards, tables…)
 * - les couleurs de texte (primary/secondary/muted)
 */
export function useKlyxorTheme() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  // Conteneur principal “cockpit” (le gros bloc blanc arrondi)
  const cockpitClass = cn(
  "w-full max-w-[1600px] mx-auto space-y-4",
  isDark ? "bg-slate-950/5" : "bg-slate-50"
);

  // Carte “hero” (batch automatique, bandeau contrats, etc.)
  const heroCardClass = cn(
    "border-none shadow-sm rounded-xl transition-colors",
    isDark
      ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-50"
      : "bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 text-slate-900",
  );

  // Cartes de section (contrats & pipeline, file de validation, facturation, etc.)
  const sectionCardClass = cn(
    "rounded-xl border shadow-sm transition-colors",
    isDark
      ? "bg-slate-950/80 border-slate-800 text-slate-50"
      : "bg-white border-slate-200 text-slate-900",
  );

  // Header de tableaux
  const tableHeaderClass = cn(
    "border-b text-[11px]",
    isDark
      ? "border-slate-800 bg-slate-950 text-slate-300"
      : "border-slate-200 bg-slate-50 text-slate-500",
  );

  // Hover sur lignes de tableaux
  const tableRowHoverClass = (base?: string) =>
    cn(
      base,
      "transition-colors",
      isDark ? "hover:bg-slate-900" : "hover:bg-slate-50",
    );

  const primaryText = isDark ? "text-slate-50" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-300" : "text-slate-600";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";

  return {
    isDark,
    toggleTheme,
    cockpitClass,
    heroCardClass,
    sectionCardClass,
    tableHeaderClass,
    tableRowHoverClass,
    primaryText,
    secondaryText,
    mutedText,
  };
}
