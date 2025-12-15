// client/src/modules/contracts/ContractsKpis.tsx

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, CheckCircle, XCircle, Archive } from "lucide-react";

export type ContractsStatusKey =
  | "draft"
  | "to_validate"
  | "active"
  | "terminated"
  | "closed";

type ContractsKpisProps = {
  kpis: any;
  loading?: boolean;
  /** Statut actuellement filtré (pour afficher la carte sélectionnée) */
  activeStatus?: ContractsStatusKey | "all";
  /**
   * Appelé lorsqu'on clique sur une carte KPI.
   * - "draft"       -> Brouillons
   * - "to_validate" -> À valider
   * - "active"      -> Actifs
   * - "terminated"  -> Résiliés
   * - "closed"      -> Clôturés
   */
  onSelectStatus?: (status: ContractsStatusKey) => void;
};

function getKpiValue(kpis: any, candidates: string[]): number {
  if (!kpis) return 0;
  for (const key of candidates) {
    const v = kpis[key];
    if (typeof v === "number") return v;
  }
  return 0;
}

/* --------- Sous-composant avec animation de compteur --------- */

type AnimatedCardProps = {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "slate" | "amber" | "emerald" | "rose";
  isActive: boolean;
  onClick?: () => void;
};

function AnimatedKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  isActive,
  onClick,
}: AnimatedCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const start = previousValueRef.current ?? 0;
    const end = value ?? 0;

    if (start === end) return;

    const duration = 250; // ms
    const startTime = performance.now();

    let frameId: number;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(start + (end - start) * progress);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    previousValueRef.current = end;

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value]);

  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex flex-row items-center justify-between rounded-xl px-4 py-3 text-left shadow-sm border transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--klyxor-bleu-nuit)]",
        isActive
          ? "border-[var(--klyxor-bleu-nuit)] bg-slate-50"
          : "border-slate-200 bg-white hover:shadow-md hover:border-[var(--klyxor-bleu-nuit)]",
      ].join(" ")}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-semibold text-slate-900">
          {displayValue}
        </p>
      </div>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border ${toneClasses}
                    group-hover:scale-105 transition-transform`}
      >
        <Icon className="h-4 w-4" />
      </div>
    </button>
  );
}

/* ----------------------- Composant principal ----------------------- */

export default function ContractsKpis({
  kpis,
  loading,
  activeStatus = "all",
  onSelectStatus,
}: ContractsKpisProps) {
  const [pulse, setPulse] = useState(false);

  // Petite animation globale à chaque changement de KPIs
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 200);
    return () => clearTimeout(t);
  }, [kpis]);

  const cards = [
    {
      key: "draft" as ContractsStatusKey,
      label: "Brouillons",
      value: getKpiValue(kpis, [
        "draft",
        "drafts",
        "brouillons",
        "draftCount",
      ]),
      icon: FileText,
      tone: "slate" as const,
    },
    {
      key: "to_validate" as ContractsStatusKey,
      label: "À valider",
      value: getKpiValue(kpis, [
        "toValidate",
        "pendingValidation",
        "aValider",
        "toValidateCount",
      ]),
      icon: Clock,
      tone: "amber" as const,
    },
    {
      key: "active" as ContractsStatusKey,
      label: "Actifs",
      value: getKpiValue(kpis, ["active", "actifs", "activeCount"]),
      icon: CheckCircle,
      tone: "emerald" as const,
    },
    {
      key: "terminated" as ContractsStatusKey,
      label: "Résiliés",
      value: getKpiValue(kpis, ["terminated", "resilies", "terminatedCount"]),
      icon: XCircle,
      tone: "rose" as const,
    },
    {
      key: "closed" as ContractsStatusKey,
      label: "Clôturés",
      value: getKpiValue(kpis, ["closed", "clotures", "closedCount"]),
      icon: Archive,
      tone: "slate" as const,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className={[
        "grid gap-3 md:grid-cols-3 lg:grid-cols-5",
        pulse ? "animate-[pulse_0.2s_ease-out]" : "",
      ].join(" ")}
    >
      {cards.map(({ key, label, value, icon, tone }) => (
        <AnimatedKpiCard
          key={key}
          label={label}
          value={value}
          icon={icon}
          tone={tone}
          isActive={activeStatus === key}
          onClick={() => onSelectStatus?.(key)}
        />
      ))}
    </div>
  );
}
