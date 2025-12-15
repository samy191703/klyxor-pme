// client/src/components/dashboard/kpi-cards.tsx

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  TrendingUp,
  Clock,
  XCircle,
  Edit,
  FileX,
  AlertTriangle,
} from "lucide-react";

interface KPICardsProps {
  kpis: {
    contractsToValidate: number;
    indexationsToValidate: number;
    dueDate30: number;
    dueDate37: number;
    dueDates1: number;
    delayedWorkflows: number;
    pendingTerminations: number;
    amendmentsToValidate: number;
    missingDocuments: number;
    importErrors: number;
  };
  loading?: boolean;

  /**
   * Callback appelé quand on clique sur une carte.
   * Exemple d’usage :
   * onCardClick={(key) => setActiveFilterFromKpi(key)}
   */
  onCardClick?: (key: keyof KPICardsProps["kpis"]) => void;
}

const kpiConfig: {
  key: keyof KPICardsProps["kpis"];
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "warning" | "info" | "danger" | "success" | "neutral";
}[] = [
  {
    key: "contractsToValidate" as keyof KPICardsProps["kpis"],
    title: "Contrats à valider",
    description: "Contrats en attente de validation",
    icon: FileText,
    color: "warning",
  },
  {
    key: "indexationsToValidate" as keyof KPICardsProps["kpis"],
    title: "Indexations à valider",
    description: "Calculs automatiques à approuver",
    icon: TrendingUp,
    color: "info",
  },
  {
    key: "dueDate30" as keyof KPICardsProps["kpis"],
    title: "Échéances J-30",
    description: "Contrats arrivant à échéance",
    icon: Clock,
    color: "info",
  },
  {
    key: "dueDate37" as keyof KPICardsProps["kpis"],
    title: "Échéances J-37",
    description: "Contrats à vérifier",
    icon: Clock,
    color: "info",
  },
  {
    key: "dueDates1" as keyof KPICardsProps["kpis"],
    title: "Échéances J+1",
    description: "Contrats dépassés à contrôler",
    icon: AlertTriangle,
    color: "warning",
  },
  {
    key: "delayedWorkflows" as keyof KPICardsProps["kpis"],
    title: "Workflows en retard",
    description: "Validations qui dépassent le délai cible",
    icon: Edit,
    color: "danger",
  },
  {
    key: "pendingTerminations" as keyof KPICardsProps["kpis"],
    title: "Résiliations à traiter",
    description: "Contrats en attente de résiliation",
    icon: XCircle,
    color: "danger",
  },
  {
    key: "amendmentsToValidate" as keyof KPICardsProps["kpis"],
    title: "Avenants à valider",
    description: "Modifications contractuelles en attente",
    icon: FileText,
    color: "warning",
  },
  {
    key: "missingDocuments" as keyof KPICardsProps["kpis"],
    title: "Documents manquants",
    description: "Contrats sans pièces justificatives",
    icon: FileX,
    color: "neutral",
  },
  {
    key: "importErrors" as keyof KPICardsProps["kpis"],
    title: "Erreurs d’import",
    description: "Données à corriger après import",
    icon: AlertTriangle,
    color: "danger",
  },
];

const toneClasses: Record<
  "warning" | "info" | "danger" | "success" | "neutral",
  string
> = {
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  info: "bg-blue-50 text-blue-700 border-blue-100",
  danger: "bg-rose-50 text-rose-700 border-rose-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  neutral: "bg-slate-50 text-slate-600 border-slate-100",
};

function getKpiValue(kpis: KPICardsProps["kpis"], key: keyof KPICardsProps["kpis"]) {
  const v = kpis?.[key];
  return typeof v === "number" ? v : 0;
}

export default function KPICards({ kpis, loading, onCardClick }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {kpiConfig.map(({ key, title, description, icon: Icon, color }) => {
        const value = getKpiValue(kpis, key);
        const tone = toneClasses[color];

        return (
          <button
            key={key}
            type="button"
            onClick={() => onCardClick?.(key)}
            className="group flex flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm
                       hover:shadow-md hover:border-[var(--klyxor-bleu-nuit)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--klyxor-bleu-nuit)]"
          >
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {title}
              </p>
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {description}
              </p>
            </div>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${tone}
                          group-hover:scale-105 transition-transform`}
            >
              <Icon className="h-4 w-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
