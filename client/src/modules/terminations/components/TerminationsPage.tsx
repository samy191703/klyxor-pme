// src/modules/terminations/components/TerminationsPage.tsx

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useTerminations } from "../queries/useTerminations";
import type { Termination } from "../domain/types";
import TerminationFilters, {
  TerminationFiltersValue,
} from "./TerminationFilters";
import TerminationsTable from "./TerminationsTable";
import CreateTerminationDialog, {
  ContractOption,
} from "./CreateTerminationDialog";
import ViewTerminationDialog from "./ViewTerminationDialog";
import { TERMINATIONS_QK } from "../domain/constants";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

export default function TerminationsPage() {
  const { data: terminations = [], isLoading, error, refetch } = useTerminations();

  // contrats pour la modale de création
  const { data: contracts = [] } = useQuery({
    queryKey: TERMINATIONS_QK.contracts,
  });

  const [filters, setFilters] = useState<TerminationFiltersValue>({
    period: "all",
    effectiveFrom: "",
    status: "all",
    search: "",
    contract: "",
    requester: "",
    validator: "",
  });

  const [selected, setSelected] = useState<Termination | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  // KPI + expansion
  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // KPIs à partir des vraies données
  const kpis = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const drafts = terminations.filter((t) => t.status === "draft").length;
    const toValidate = terminations.filter(
      (t) => t.status === "pending_validation"
    ).length;
    const validated30 = terminations.filter((t) => {
      if (t.status !== "validated") return false;
      if (!t.validatedAt) return false;
      return now - new Date(t.validatedAt).getTime() <= THIRTY_DAYS;
    }).length;
    const rejected = terminations.filter((t) => t.status === "rejected").length;

    return { drafts, toValidate, validated30, rejected, total: terminations.length };
  }, [terminations]);

  // Filtres appliqués
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return terminations.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;

      if (filters.contract) {
        const c = filters.contract.toLowerCase();
        if (
          !(
            (t.contractId ?? "").toLowerCase().includes(c) ||
            (t.number ?? "").toLowerCase().includes(c)
          )
        )
          return false;
      }

      if (
        filters.requester &&
        !(t.requestedBy ?? "")
          .toLowerCase()
          .includes(filters.requester.toLowerCase())
      )
        return false;

      if (
        filters.validator &&
        !(t.validatedBy ?? "")
          .toLowerCase()
          .includes(filters.validator.toLowerCase())
      )
        return false;

      if (
        filters.effectiveFrom &&
        t.effectiveDate &&
        new Date(t.effectiveDate) < new Date(filters.effectiveFrom)
      )
        return false;

      if (
        q &&
        !(
          (t.id ?? "").toLowerCase().includes(q) ||
          (t.reason ?? "").toLowerCase().includes(q) ||
          (t.number ?? "").toLowerCase().includes(q) ||
          (t.contractId ?? "").toLowerCase().includes(q)
        )
      )
        return false;

      return true;
    });
  }, [terminations, filters]);

  const toggleExpand = () => {
    setExpanded((prev) => {
      const next = !prev;
      setShowKpis(!next); // cache les KPI quand on met le tableau en avant
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du chargement des résiliations {(error as Error).message}
      </div>
    );
  }

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setOpenCreate(true)}
          data-testid="button-new-termination"
          className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900 text-xs"
        >
          <Plus className="h-4 w-4" />
          Nouvelle résiliation
        </Button>

        <Button
          variant="outline"
          onClick={toggleExpand}
          title={expanded ? "Réduire" : "Mettre le tableau en avant"}
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          {expanded ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          Statistiques
        </Button>

        <Button
          variant="outline"
          onClick={handleRefresh}
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>
    );
  };

  return (
    <>
      <KlyxorPageLayout
        title="Gestion des résiliations"
        subtitle="Gérer les demandes de résiliation et leur workflow de validation."
        actions={renderHeaderActions}
      >
        {(theme) => {
          const {
            heroCardClass,
            sectionCardClass,
            primaryText,
            secondaryText,
            mutedText,
            isDark,
          } = theme;

          if (isLoading && terminations.length === 0) {
            return (
              <Card className={sectionCardClass}>
                <CardContent className="p-6 text-center text-sm">
                  <span className={cn("text-sm", mutedText)}>
                    Chargement des résiliations...
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="w-full space-y-4" data-testid="terminations-main">
              {/* HERO KPI */}
              <Card className={heroCardClass}>
                <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,1fr]">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      Vue globale des résiliations
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {kpis.total} demande(s) au total • {kpis.toValidate} à
                      valider • {kpis.validated30} validées sur 30 jours.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <HeroKpi
                      label="Brouillons"
                      value={kpis.drafts}
                      tone="muted"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="À valider"
                      value={kpis.toValidate}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Validées (30 j)"
                      value={kpis.validated30}
                      tone="success"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Rejetées"
                      value={kpis.rejected}
                      tone="danger"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mini KPI */}
              {showKpis && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                  <MiniKpi
                    label="Total demandes"
                    value={kpis.total}
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="Brouillons"
                    value={kpis.drafts}
                    tone="muted"
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="À valider"
                    value={kpis.toValidate}
                    tone="warning"
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="Rejetées"
                    value={kpis.rejected}
                    tone="danger"
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Filtres */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                    <TerminationFilters
                      value={filters}
                      onChange={(patch) =>
                        setFilters((s) => ({ ...s, ...patch }))
                      }
                    />
                  </div>
                  <div className="flex items-start space-x-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className={cn(
                        "gap-2 text-xs",
                        isDark
                          ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Actualiser
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className={sectionCardClass}>
                <CardContent className="p-0">
                  <TerminationsTable
                    rows={filtered}
                    height={expanded ? "500px" : "400px"}
                    onView={(t) => setSelected(t)}
                    onValidate={(t) => setSelected(t)}
                    onReject={(t) => setSelected(t)}
                  />
                </CardContent>
              </Card>
            </div>
          );
        }}
      </KlyxorPageLayout>

      {/* Dialogs */}
      <CreateTerminationDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        contracts={contracts as ContractOption[]}
      />

      <ViewTerminationDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onValidate={() => {
          setSelected(null);
          refetch();
        }}
        onReject={() => {
          setSelected(null);
          refetch();
        }}
      />
    </>
  );
}

/* === Petits composants KPI === */

function HeroKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "danger" | "muted";
  isDark: boolean;
}) {
  const bg =
    tone === "warning"
      ? isDark
        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
        : "bg-amber-50 border-amber-200 text-amber-700"
      : tone === "success"
      ? isDark
        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
        : "bg-emerald-50 border-emerald-200 text-emerald-700"
      : tone === "danger"
      ? isDark
        ? "bg-red-500/10 border-red-500/40 text-red-100"
        : "bg-red-50 border-red-200 text-red-700"
      : tone === "muted"
      ? isDark
        ? "bg-slate-950/40 border-slate-700 text-slate-200"
        : "bg-slate-50 border-slate-200 text-slate-700"
      : isDark
      ? "bg-slate-950/40 border-slate-700 text-slate-100"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
        bg,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">
        {value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "danger" | "muted";
  isDark: boolean;
}) {
  const bg =
    tone === "danger"
      ? isDark
        ? "bg-red-500/15 text-red-200 border-red-500/40"
        : "bg-red-50 text-red-700 border-red-200"
      : tone === "warning"
      ? isDark
        ? "bg-amber-500/15 text-amber-100 border-amber-500/40"
        : "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "success"
      ? isDark
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "muted"
      ? isDark
        ? "bg-slate-900/60 text-slate-100 border-slate-700/60"
        : "bg-slate-50 text-slate-700 border-slate-200"
      : isDark
      ? "bg-slate-900/60 text-slate-100 border-slate-700/60"
      : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
        bg,
      )}
    >
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}
