// client/src/modules/validation-requests/components/ValidationRequestsPage.tsx

"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Plus, RefreshCw, Eye, EyeOff } from "lucide-react";

import type { ValidationRequest } from "../domain/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import ValidationRequestFilters, {
  ValidationRequestFiltersValue,
} from "./ValidationRequestFilters";
import ValidationRequestsTable from "./ValidationRequestsTable";

import CreateValidationRequestDialog from "../components/CreateValidationRequestDialog";
import ViewValidationRequestDialog from "../components/ViewValidationRequestDialog";

import {
  useValidationRequests,
  useApproveValidationRequest,
  useRejectValidationRequest,
  useRedirectValidationRequest,
} from "../queries/hooks";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

export default function ValidationRequestsPage() {
  const { data: vrList = [], isLoading, refetch } = useValidationRequests();

  const [filters, setFilters] = useState<ValidationRequestFiltersValue>({
    status: "all",
    search: "",
    type: "",
    referenceId: "",
    createdFrom: "",
  });

  const [selected, setSelected] = useState<ValidationRequest | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");

  // KPIs + expand control
  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const kpis = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const pending = vrList.filter((v) => v.status === "pending").length;
    const approved30 = vrList.filter((v) => {
      if (v.status !== "approved") return false;
      return now - new Date(v.updatedAt).getTime() <= THIRTY_DAYS;
    }).length;
    const rejected = vrList.filter((v) => v.status === "rejected").length;
    const redirected = vrList.filter((v) => v.status === "redirected").length;

    return { pending, approved30, rejected, redirected };
  }, [vrList]);

  // Local filtering (supports joined display fields)
  const filtered = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();

    return vrList.filter((v) => {
      if (filters.status !== "all" && v.status !== filters.status) return false;

      if (
        filters.type &&
        !v.type.toLowerCase().includes(filters.type.toLowerCase())
      )
        return false;

      if (
        filters.referenceId &&
        !(v.referenceId ?? "")
          .toLowerCase()
          .includes(filters.referenceId.toLowerCase())
      )
        return false;

      if (
        filters.createdFrom &&
        new Date(v.createdAt) < new Date(filters.createdFrom)
      )
        return false;

      if (q) {
        const haystack = [
          v.id,
          v.reference,
          v.subject,
          v.referenceId,
          v.requestedByUser?.name,
          v.requestedByUser?.email,
          v.assignedToUser?.name,
          v.assignedToUser?.email,
          v.validatedByUser?.name,
          v.validatedByUser?.email,
        ]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .join(" ");

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [vrList, filters]);

  const toggleExpand = () => {
    setExpanded((prev) => {
      const next = !prev;
      setShowKpis(!next);
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
  };

  // === mutations bound to selected item (safely guarded in handlers) ===
  const approveMx = useApproveValidationRequest(selected?.id ?? "");
  const rejectMx = useRejectValidationRequest(selected?.id ?? "");
  const redirectMx = useRedirectValidationRequest(selected?.id ?? "");

  // Actions dans le header cockpit (ISO avec Dashboard / Contrats / Indexations)
  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={toggleExpand}
          title={expanded ? "Réduire les statistiques" : "Mettre le tableau en avant"}
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

        <Button
          onClick={() => setOpenCreate(true)}
          data-testid="button-new-validation-request"
          className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900 text-xs"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>
    );
  };

  return (
    <>
      <KlyxorPageLayout
        title="Validation & contrôle"
        subtitle="Gérer les demandes et leur workflow de validation."
        actions={renderHeaderActions}
      >
        {(theme) => {
          const {
            heroCardClass,
            sectionCardClass,
            primaryText,
            secondaryText,
            mutedText,
            tableHeaderClass,
            tableRowHoverClass,
            isDark,
          } = theme;

          // === Loader intégré dans le cockpit ===
          if (isLoading && vrList.length === 0) {
            return (
              <Card className={sectionCardClass}>
                <CardContent className="p-6 text-center text-sm">
                  <span className={cn("text-sm", mutedText)}>
                    Chargement des demandes de validation…
                  </span>
                </CardContent>
              </Card>
            );
          }

          const tableRowClass = (base?: string) =>
            tableRowHoverClass(
              cn(base, isDark ? "border-slate-800" : "border-slate-100"),
            );

          return (
            <>
              {/* HERO – résumé global (ISO avec Contracts/Indexations) */}
              <Card className={heroCardClass}>
                <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,0.9fr]">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      Vue globale des demandes de validation
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {vrList.length} demande(s) au total • {kpis.pending} en
                      attente • {kpis.approved30} approuvées sur 30 jours
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs">
                    <HeroStat
                      label="En attente"
                      value={kpis.pending}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroStat
                      label="Approuvées (30 j)"
                      value={kpis.approved30}
                      tone="success"
                      isDark={isDark}
                    />
                    <HeroStat
                      label="Rejetées / redirigées"
                      value={kpis.rejected + kpis.redirected}
                      tone="danger"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* KPI mini – affichés seulement si showKpis = true (comme avant) */}
              {showKpis && (
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-4">
                  <MiniKpi
                    label="En attente"
                    value={kpis.pending}
                    isDark={isDark}
                    tone="warning"
                  />
                  <MiniKpi
                    label="Approuvées (30 j)"
                    value={kpis.approved30}
                    isDark={isDark}
                    tone="success"
                  />
                  <MiniKpi
                    label="Rejetées"
                    value={kpis.rejected}
                    isDark={isDark}
                    tone="danger"
                  />
                  <MiniKpi
                    label="Redirigées"
                    value={kpis.redirected}
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Filtres */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
                    <ValidationRequestFilters
                      value={filters}
                      onChange={(patch) =>
                        setFilters((s) => ({ ...s, ...patch }))
                      }
                    />
                  </div>
                  <div className="flex items-start justify-end">
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

              {/* Tableau */}
              <Card className={sectionCardClass}>
                <CardHeader className="px-4 pt-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle
                        className={cn(
                          "text-sm font-semibold",
                          primaryText,
                        )}
                      >
                        Demandes de validation ({filtered.length})
                      </CardTitle>
                      <div className={cn("text-[11px]", secondaryText)}>
                        Liste des demandes et de leur statut de traitement.
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-[11px]",
                        mutedText,
                      )}
                    >
                      {vrList.length} demande(s) au total
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* La table elle-même est gérée par ValidationRequestsTable */}
                  <ValidationRequestsTable
                    rows={filtered}
                    height={expanded ? "500px" : "400px"}
                    onView={(v) => setSelected(v)}
                    onApprove={(v) => setSelected(v)}
                    onReject={(v) => setSelected(v)}
                    onRedirect={(v) => setSelected(v)}
                    // Les classes de lignes/headers sont appliquées dans le composant interne.
                    // Si besoin, tu pourras les harmoniser de la même façon que les autres tables.
                  />
                </CardContent>
              </Card>
            </>
          );
        }}
      </KlyxorPageLayout>

      {/* Dialogs */}
      <CreateValidationRequestDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
      />

      <ViewValidationRequestDialog
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setReasonDraft("");
        }}
        data={selected}
        onChangeReason={setReasonDraft}
        loadingApprove={approveMx.isPending}
        loadingReject={rejectMx.isPending}
        loadingRedirect={redirectMx.isPending}
        onApprove={() => {
          if (!selected) return;
          approveMx.mutate(undefined, {
            onSuccess: async () => {
              setSelected(null);
              setReasonDraft("");
              await refetch();
            },
          });
        }}
        onReject={() => {
          if (!selected) return;
          const reason = (reasonDraft ?? "").trim();
          if (reason.length < 5) {
            alert("Le motif est requis (minimum 5 caractères).");
            return;
          }
          rejectMx.mutate(reason, {
            onSuccess: async () => {
              setSelected(null);
              setReasonDraft("");
              await refetch();
            },
          });
        }}
        onRedirect={() => {
          if (!selected) return;
          const assignedTo = window.prompt("ID du valideur destinataire ?");
          if (!assignedTo) return;

          redirectMx.mutate(
            { assignedTo, reason: (reasonDraft ?? "").trim() || undefined },
            {
              onSuccess: async () => {
                setSelected(null);
                setReasonDraft("");
                await refetch();
              },
            }
          );
        }}
      />
    </>
  );
}

/* === Petits composants UI locaux pour les KPI === */

function HeroStat({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  isDark: boolean;
}) {
  const base =
    tone === "success"
      ? isDark
        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
        : "bg-emerald-50 border-emerald-200 text-emerald-700"
      : tone === "warning"
      ? isDark
        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
        : "bg-amber-50 border-amber-200 text-amber-700"
      : tone === "danger"
      ? isDark
        ? "bg-red-500/10 border-red-500/40 text-red-100"
        : "bg-red-50 border-red-200 text-red-700"
      : isDark
      ? "bg-slate-950/40 border-slate-700 text-slate-100"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
        base,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">{value}</span>
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
  tone?: "default" | "success" | "warning" | "danger";
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
