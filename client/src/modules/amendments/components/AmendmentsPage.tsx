// src/modules/amendments/components/AmendmentsPage.tsx

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAmendments } from "../queries/useAmendments";
import { useQuery } from "@tanstack/react-query";
import { AMENDMENTS_QK } from "../domain/constants";
import type { Amendment, ContractRef } from "../domain/types";
import AmendmentFilters, { AmendmentFiltersValue } from "./AmendmentFilters";
import { AmendmentsTable } from "./AmendmentsTable";
import { CreateAmendmentDialog } from "./CreateAmendmentDialog";
import { ViewAmendmentDialog } from "./ViewAmendmentDialog";
import { EditAmendmentDialog } from "./EditAmendmentDialog";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

export default function AmendmentsPage() {
  // On récupère les permissions sous forme de booléens
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const {
    data: amendments = [],
    isLoading,
    error,
    refetch,
  } = useAmendments();

  const { data: contracts = [] } = useQuery({
    queryKey: AMENDMENTS_QK.contracts,
  });

  const [filters, setFilters] = useState<AmendmentFiltersValue>({
    search: "",
    status: "all",
    type: "all",
  });

  const [selected, setSelected] = useState<Amendment | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  // KPI visibility + table expand
  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return amendments.filter((a) => {
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.type !== "all" && a.type !== filters.type) return false;
      if (
        q &&
        !(
          a.title?.toLowerCase().includes(q) ||
          a.number.toLowerCase().includes(q) ||
          a.contractNumber?.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [amendments, filters]);

  const handleDelete = async (id: string) => {
    // On considère canDeleteContract comme un booléen
    if (!canDeleteContract || !confirm("Êtes-vous sûr de vouloir supprimer cet avenant ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/amendments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");

      toast({
        title: "Avenant supprimé",
        description: "L'avenant a été supprimé avec succès",
      });
      await refetch();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avenant",
        variant: "destructive",
      });
    }
  };

  // toggle expansion (et hide KPIs quand expand)
  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      setShowKpis(!next ? true : false);
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
    setFilters((s) => ({ ...s }));
  };

  if (error) {
    console.error(error);
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du chargement des avenants {(error as Error).message}
      </div>
    );
  }

  const kpi = {
    total: amendments.length,
    drafts: amendments.filter((a) => a.status === "draft").length,
    pending: amendments.filter((a) => a.status === "pending_signature").length,
    active: amendments.filter((a) => a.status === "active").length,
    rejected: amendments.filter((a) => a.status === "rejected").length,
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        {/* Bouton création d’avenant conditionné par la permission */}
        <Button
          onClick={() => setOpenCreate(true)}
          data-testid="button-new-amendment"
          className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900 text-xs"
          disabled={!canCreateContract}
        >
          <Plus className="h-4 w-4" />
          Nouvel avenant
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
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeOffIcon className="w-4 h-4" />
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
        title="Gestion des avenants"
        subtitle="Gérer les différentes mises à jour de vos termes de contrats."
        actions={renderHeaderActions}
      >
        {(theme) => {
          const {
            heroCardClass,
            sectionCardClass,
            mutedText,
            isDark,
          } = theme;

          // Loader intégré dans le cockpit
          if (isLoading && amendments.length === 0) {
            return (
              <Card className={sectionCardClass}>
                <CardContent className="p-6 text-center text-sm">
                  <span className={cn("text-sm", mutedText)}>
                    Chargement des avenants...
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="w-full space-y-4" data-testid="amendments-main">
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
                      Vue globale des avenants
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {kpi.total} avenant(s) au total • {kpi.active} actif(s) •{" "}
                      {kpi.pending} en attente de signature.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <HeroKpi
                      label="Total avenants"
                      value={kpi.total}
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Brouillons"
                      value={kpi.drafts}
                      tone="muted"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="À signer"
                      value={kpi.pending}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Actifs"
                      value={kpi.active}
                      tone="success"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mini KPI – affichés seulement si showKpis = true */}
              {showKpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
                  <MiniKpi
                    label="Total avenants"
                    value={kpi.total}
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="Brouillons"
                    value={kpi.drafts}
                    tone="muted"
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="À signer"
                    value={kpi.pending}
                    tone="warning"
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="Actifs"
                    value={kpi.active}
                    tone="success"
                    isDark={isDark}
                  />
                  <MiniKpi
                    label="Rejetés"
                    value={kpi.rejected}
                    tone="danger"
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Filtres */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                    <AmendmentFilters
                      value={filters}
                      onChange={(patch) =>
                        setFilters((s) => ({ ...s, ...patch }))
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 justify-end">
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
                  <AmendmentsTable
                    rows={filtered}
                    height={expanded ? "500px" : "400px"}
                    onView={(a) => {
                      setSelected(a);
                      setOpenView(true);
                    }}
                    onEdit={(a) => {
                      setSelected(a);
                      setOpenEdit(true);
                    }}
                    onDelete={handleDelete}
                  />
                </CardContent>
              </Card>
            </div>
          );
        }}
      </KlyxorPageLayout>

      {/* Dialogs */}
      <CreateAmendmentDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        contracts={contracts as ContractRef[]}
        canCreate={!!canCreateContract}
      />
      <ViewAmendmentDialog
        open={openView}
        onOpenChange={setOpenView}
        a={selected}
      />
      <EditAmendmentDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        a={selected}
        // On passe un booléen, plus d’appel de fonction
        canEdit={!!canModifyContract}
      />
    </>
  );
}

/* === Petits composants KPI pour hero + mini-ligne === */

function HeroKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "muted";
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
