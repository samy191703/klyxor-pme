// components/KpiCounters.tsx
import { Card, CardContent } from "@mui/material";
import { BILLING_STATUS_LABELS } from "../domain/constants";
import { BILLING_TYPE_LABELS } from "@shared/enums/billing.enum";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
  Timer,
  Target,
} from "lucide-react";

interface KpiCountersProps {
  kpi: {
    // KPI existants (pour compatibilité)
    totalCount?: number;
    draft?: number;
    active?: number;
    archived?: number;
    A_ECHOIR?: number;
    TERME_ECHU?: number;
    // Nouveaux KPI selon le ticket
    totalInvoiced?: number;
    evolutionPercent?: number;
    invoicesInProgressCount?: number;
    invoicesInProgressAmount?: number;
    pendingAmount?: number;
    rejectedInvoicesCount?: number;
    indexationAmount?: number;
    indexationCount?: number;
    upcomingIndexationsCount?: number;
    collectedAmount?: number;
    overdueAmount?: number;
    dso?: number;
    forecasts?: {
      threeMonths?: number;
      sixMonths?: number;
      twelveMonths?: number;
    };
  };
}

const formatMoney = (amount: number | undefined, compact: boolean = true): string => {
  if (amount === undefined || amount === null) return "0 €";
  
  if (compact) {
    // Format compact pour les KPI
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M €`;
    } else if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(1)}K €`;
    }
    return `${Math.round(amount)} €`;
  }
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (percent: number | undefined): string => {
  if (percent === undefined || percent === null) return "0,00 %";
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)} %`;
};

const formatDays = (days: number | undefined): string => {
  if (days === undefined || days === null) return "0";
  return `${Math.round(days)}j`;
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "red" | "orange" | "purple" | "yellow" | "gray";
  compact?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = "blue",
  compact = false,
}) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };

  const valueColorClasses = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    orange: "text-orange-700",
    purple: "text-purple-700",
    yellow: "text-yellow-700",
    gray: "text-gray-700",
  };

  return (
    <Card className={`${compact ? "p-2" : "p-3"} border ${colorClasses[color]} hover:shadow-md transition-shadow`}>
      <CardContent className={`${compact ? "p-0" : "p-0"} flex items-start justify-between`}>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-1 ${compact ? "mb-0.5" : ""}`}>
            <div className={`${compact ? "w-4 h-4" : "w-5 h-5"} flex-shrink-0`}>{icon}</div>
            <span className={`text-gray-600 truncate ${compact ? "text-xs" : "text-sm"}`}>
              {label}
            </span>
          </div>
          <div className={`font-bold ${valueColorClasses[color]} ${compact ? "text-lg" : "text-xl"} mt-1`}>
            {value}
          </div>
        </div>
        {trend && (
          <div className="flex-shrink-0 ml-2">
            {trend === "up" && (
              <ArrowUpRight className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-green-600`} />
            )}
            {trend === "down" && (
              <ArrowDownRight className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-red-600`} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const KpiCounters: React.FC<KpiCountersProps> = ({ kpi }) => {
  const evolutionTrend = (kpi.evolutionPercent || 0) >= 0 ? "up" : "down";

  return (
    <div className="space-y-3 mb-4">
      {/* Ligne 1: Facturation globale - 4 KPI compacts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={<Euro className="w-full h-full" />}
          label="Total facturé"
          value={formatMoney(kpi.totalInvoiced)}
          color="blue"
          compact
        />
        <KpiCard
          icon={evolutionTrend === "up" ? <TrendingUp className="w-full h-full" /> : <TrendingDown className="w-full h-full" />}
          label="Évolution N-1"
          value={formatPercent(kpi.evolutionPercent)}
          trend={evolutionTrend}
          color={evolutionTrend === "up" ? "green" : "red"}
          compact
        />
        <KpiCard
          icon={<Wallet className="w-full h-full" />}
          label="Encaissé"
          value={formatMoney(kpi.collectedAmount)}
          color="purple"
          compact
        />
        <KpiCard
          icon={<AlertCircle className="w-full h-full" />}
          label="En retard"
          value={formatMoney(kpi.overdueAmount)}
          color="red"
          compact
        />
      </div>

      {/* Ligne 2: Factures en attente - 4 KPI compacts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={<FileText className="w-full h-full" />}
          label="En cours"
          value={kpi.invoicesInProgressCount || 0}
          color="orange"
          compact
        />
        <KpiCard
          icon={<DollarSign className="w-full h-full" />}
          label="Montant en cours"
          value={formatMoney(kpi.invoicesInProgressAmount)}
          color="orange"
          compact
        />
        <KpiCard
          icon={<Clock className="w-full h-full" />}
          label="En attente"
          value={formatMoney(kpi.pendingAmount)}
          color="blue"
          compact
        />
        <KpiCard
          icon={<XCircle className="w-full h-full" />}
          label="Rejetées"
          value={kpi.rejectedInvoicesCount || 0}
          color="red"
          compact
        />
      </div>

      {/* Ligne 3: Indexation & DSO - 4 KPI compacts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={<TrendingUp className="w-full h-full" />}
          label="Montant indexation"
          value={formatMoney(kpi.indexationAmount)}
          color="green"
          compact
        />
        <KpiCard
          icon={<BarChart3 className="w-full h-full" />}
          label="Indexations appliquées"
          value={kpi.indexationCount || 0}
          color="green"
          compact
        />
        <KpiCard
          icon={<Calendar className="w-full h-full" />}
          label="Indexations prévues"
          value={kpi.upcomingIndexationsCount || 0}
          color="blue"
          compact
        />
        <KpiCard
          icon={<Timer className="w-full h-full" />}
          label="DSO"
          value={formatDays(kpi.dso)}
          color="purple"
          compact
        />
      </div>

      {/* Ligne 4: Prévisions - 3 KPI compacts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <KpiCard
          icon={<Target className="w-full h-full" />}
          label="Prévisions 3 mois"
          value={formatMoney(kpi.forecasts?.threeMonths)}
          color="blue"
          compact
        />
        <KpiCard
          icon={<Target className="w-full h-full" />}
          label="Prévisions 6 mois"
          value={formatMoney(kpi.forecasts?.sixMonths)}
          color="blue"
          compact
        />
        <KpiCard
          icon={<Target className="w-full h-full" />}
          label="Prévisions 12 mois"
          value={formatMoney(kpi.forecasts?.twelveMonths)}
          color="blue"
          compact
        />
      </div>

      {/* KPI existants (pour compatibilité) - Optionnel et compact */}
      {(kpi.totalCount !== undefined || kpi.draft !== undefined || kpi.active !== undefined) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {kpi.totalCount !== undefined && (
            <KpiCard
              icon={<Receipt className="w-full h-full" />}
              label="Total plans"
              value={kpi.totalCount}
              color="blue"
              compact
            />
          )}
          {kpi.draft !== undefined && (
            <KpiCard
              icon={<FileText className="w-full h-full" />}
              label={BILLING_STATUS_LABELS.draft}
              value={kpi.draft}
              color="gray"
              compact
            />
          )}
          {kpi.active !== undefined && (
            <KpiCard
              icon={<CheckCircle className="w-full h-full" />}
              label={BILLING_STATUS_LABELS.active}
              value={kpi.active}
              color="green"
              compact
            />
          )}
          {kpi.archived !== undefined && (
            <KpiCard
              icon={<BarChart3 className="w-full h-full" />}
              label={BILLING_STATUS_LABELS.archived}
              value={kpi.archived}
              color="purple"
              compact
            />
          )}
        </div>
      )}
    </div>
  );
};
