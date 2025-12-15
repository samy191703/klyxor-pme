// src/modules/billing/components/BillingModulePage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  EyeIcon,
  EyeOffIcon,
  Filter as FilterIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";

import type {
  BillingSchedule,
  BillingLine,
  BillingScheduleStatus,
  BillingScheduleWithLines,
} from "../domain/types";

import { useBillingSchedules } from "../queries/useBillingSchedules";
import { useBillingLinesBySchedule } from "../queries/useBillingLinesBySchedule";

import {
  downloadBillingSchedulePdf,
  fetchBillingScheduleWithLines,
} from "../api/billing.api";

import { useBillingKpis } from "../queries/useBillingKpis";
import { BillingFrequency } from "@shared/enums/billing.enum";
import { BILLING_STATUS_LABELS, DEFAULT_FILTERS } from "../domain/constants";

import { BillingLinesTable } from "../components/BillingLinesTable";
import { BillingSchedulesTable } from "../components/BillingSchedulesTable";
import { DeleteBillingScheduleDialog } from "../components/dialogs/DeleteBillingScheduleDialog";
import ViewBillingScheduleDialog from "../components/dialogs/ViewBillingScheduleDialog";
import FiltersCard from "../components/FiltersCard";
import { KpiCharts } from "../components/KpiCharts";
import { KpiCounters } from "../components/KpiCounters";
import { KpiDashboard } from "../components/KpiDashboard";
import {
  exportBillingSchedulesListToExcel,
  exportBillingScheduleToExcel,
} from "../utils/export-excel";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

export default function BillingModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const {
    data: schedulesData,
    isLoading,
    error,
    refetch,
  } = useBillingSchedules(filters);

  const schedules = schedulesData?.rows ?? [];
  const totalSchedules = schedulesData?.total ?? 0;
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  // Plan sélectionné (alimente les lignes)
  const [selectedSchedule, setSelectedSchedule] =
    useState<BillingSchedule | null>(null);

  // Filtres pour les KPIs
  const [kpiFilters, setKpiFilters] = useState({
    from: "",
    to: "",
    customer: "",
  });
  const { data: summaryKpis } = useBillingKpis(kpiFilters);

  const customerOptions = useMemo(() => {
    if (!schedules) return [];
    return Array.from(
      new Set(schedules.map((s) => s.clientName).filter(Boolean))
    );
  }, [schedules]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  useEffect(() => {
    const handler = () => setShowCustomerList(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const rootStyles =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
      : ({ getPropertyValue: () => "#ffffff" } as any);

  const COLORS = [
    rootStyles.getPropertyValue("--klyxor-bleu-nuit").trim() || "#0F2A43",
    rootStyles.getPropertyValue("--klyxor-or").trim() || "#D8B24A",
    rootStyles.getPropertyValue("--klyxor-blanc").trim() || "#FFFFFF",
  ];

  // Lignes du plan courant
  const currentScheduleId = selectedSchedule?.id ?? null;
  const { data: lines = [] } = useBillingLinesBySchedule(currentScheduleId);

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [showKpiFilters, setShowKpiFilters] = useState(false);

  // Détail pour la modale "Voir" (avec lignes)
  const [viewingSchedule, setViewingSchedule] = useState<
    (BillingSchedule & { lines?: BillingLine[] }) | null
  >(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showKpis, setShowKpis] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  const handleExportExcel = async (row: BillingSchedule) => {
    try {
      setExportingId(row.id);

      const data: BillingScheduleWithLines =
        await fetchBillingScheduleWithLines(row.id);

      exportBillingScheduleToExcel(data);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Export Excel échoué",
        description:
          error?.message ??
          "Une erreur est survenue lors de l’export de l’échéancier.",
      });
    } finally {
      setExportingId(null);
    }
  };

  // KPI agrégés
  const kpi = useMemo(() => {
    const api = summaryKpis;

    if (!api)
      return {
        totalCount: 0,
        totalAmount: 0,
        draft: 0,
        active: 0,
        archived: 0,
        A_ECHOIR: 0,
        TERME_ECHU: 0,
      };

    const getStatus = (name: string) =>
      Number(api.status?.find((x: any) => x.status === name)?.count ?? 0);
    const getType = (name: string) =>
      Number(
        api.billingType?.find((x: any) => x.billingType === name)?.count ?? 0
      );

    return {
      totalCount: Number(api.totals?.count ?? 0),
      totalAmount: api.totals?.totalCentimes
        ? Number(api.totals.totalCentimes) / 100
        : 0,
      draft: getStatus("draft"),
      active: getStatus("active"),
      archived: getStatus("archived"),
      A_ECHOIR: getType("A_ECHOIR"),
      TERME_ECHU: getType("TERME_ECHU"),
    };
  }, [summaryKpis]);

  // Graphe paiements / jour (pro rata)
  const paymentsByDayProRata = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const data = days.map((d) => ({
      date: format(d, "yyyy-MM-dd"),
      totalAmount: 0,
    }));

    schedules.forEach((schedule: any) => {
      if (!schedule.lines || schedule.lines.length === 0) return;

      const totalScheduleAmount = (schedule.lines as BillingLine[]).reduce(
        (s: number, line: BillingLine) => s + (Number(line.amountHt) || 0),
        0
      );

      let monthlyEquivalent = 0;
      switch (schedule.frequency) {
        case BillingFrequency.MONTHLY:
          monthlyEquivalent = totalScheduleAmount;
          break;
        case BillingFrequency.QUARTERLY:
          monthlyEquivalent = totalScheduleAmount / 3;
          break;
        case BillingFrequency.SEMIANNUAL:
          monthlyEquivalent = totalScheduleAmount / 6;
          break;
        case BillingFrequency.ANNUAL:
          monthlyEquivalent = totalScheduleAmount / 12;
          break;
        default:
          monthlyEquivalent = 0;
      }

      const startDate = startOfDay(parseISO(schedule.startDate));
      const effectiveStart = isBefore(startDate, monthStart)
        ? monthStart
        : startDate;

      const endDate = schedule.endDate
        ? startOfDay(parseISO(schedule.endDate))
        : null;
      const effectiveEnd =
        endDate && isBefore(endDate, monthEnd) ? endDate : monthEnd;

      if (isAfter(effectiveStart, effectiveEnd)) return;

      const activeDaysCount = eachDayOfInterval({
        start: effectiveStart,
        end: effectiveEnd,
      }).length;
      if (activeDaysCount <= 0) return;

      const dailyAmount = monthlyEquivalent / activeDaysCount;

      data.forEach((d) => {
        const dDate = parseISO(d.date);
        if (!isBefore(dDate, effectiveStart) && !isAfter(dDate, effectiveEnd)) {
          d.totalAmount += dailyAmount;
        }
      });
    });

    return data;
  }, [schedules]);

  const donutData = useMemo(() => {
    if (!summaryKpis || !summaryKpis.status) return [];

    const total = summaryKpis.status.reduce(
      (sum: number, s: any) => sum + Number(s.count || 0),
      0
    );

    return summaryKpis.status.map((item: any) => ({
      name:
        BILLING_STATUS_LABELS[item.status as BillingScheduleStatus] ||
        item.status,
      value: Number(item.count || 0),
      percent: total > 0 ? (Number(item.count) / total) * 100 : 0,
    }));
  }, [summaryKpis]);

  const filteredSchedules = schedules;
  const paginatedSchedules = schedules;

  const handleDeleteSchedule = async (id: string) => {
    if (
      !canDeleteContract() ||
      !confirm("Êtes-vous sûr de vouloir supprimer ce plan de facturation ?")
    )
      return;
    try {
      const res = await fetch(`/api/billing-schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");
      toast({
        title: "Plan supprimé",
        description: "Le plan de facturation a été supprimé avec succès",
      });
      await refetch();
      if (selectedSchedule?.id === id) setSelectedSchedule(null);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le plan de facturation",
        variant: "destructive",
      });
    }
  };

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
    setFilters(DEFAULT_FILTERS);
    setCustomerSearch("");
    setKpiFilters({ from: "", to: "", customer: "" });
  };

  const handleViewSchedule = async (row: BillingSchedule) => {
    try {
      setViewLoading(true);
      const res = await fetch(`/api/billing-schedules/${row.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fetch_detail_failed");
      const full = (await res.json()) as BillingSchedule & {
        lines?: BillingLine[];
      };
      setViewingSchedule(full);
      setOpenView(true);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du plan de facturation",
        variant: "destructive",
      });
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownloadSchedule = async (row: BillingSchedule) => {
    try {
      setDownloadingId(row.id);
      await downloadBillingSchedulePdf(
        row.id,
        row.contractNumber ?? row.contractId
      );
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l’échéancier en PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportAllExcel = () => {
    try {
      setExportingAll(true);
      const toExport = filteredSchedules.length ? filteredSchedules : schedules;
      exportBillingSchedulesListToExcel(toExport);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Export Excel échoué",
        description:
          error?.message ??
          "Une erreur est survenue lors de l’export des plans de facturation.",
      });
    } finally {
      setExportingAll(false);
    }
  };

  const customerOptionsClean: string[] = customerOptions.filter(
    (c): c is string => typeof c === "string" && c.trim() !== ""
  );

  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Erreur lors du chargement : {(error as Error).message}
      </div>
    );

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={toggleExpand}
          title={expanded ? "Réduire" : "Afficher les statistiques"}
          className={cn(
            "text-xs gap-2",
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
          size="icon"
          onClick={() => setShowKpiFilters((v) => !v)}
          className={cn(
            "relative",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          title="Afficher / masquer les filtres KPI"
        >
          <FilterIcon className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--klyxor-or,#D8B24A)] rounded-full" />
        </Button>

        <Button
          variant="outline"
          className={cn(
            "text-xs gap-2",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={handleExportAllExcel}
          disabled={exportingAll}
        >
          Export Excel
        </Button>
      </div>
    );
  };

  return (
    <>
      <KlyxorPageLayout
        title="Gestion de la facturation"
        subtitle="Gérer les plans de facturation et leurs lignes."
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

          const customerOptionsForKpi = customerOptions.filter(
            (c): c is string => c !== undefined
          );

          return (
            <div className="space-y-4" data-testid="billing-main">
              {/* HERO – résumé global facturation */}
              <Card className={heroCardClass}>
                <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,1fr]">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      Vue globale des plans de facturation
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {kpi.totalCount} plan(s) au total • Montant cumulé ≈{" "}
                      <span className="font-semibold">
                        {kpi.totalAmount.toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>{" "}
                      € • {kpi.active} plan(s) actifs
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs">
                    <HeroKpi
                      label="Plans actifs"
                      value={kpi.active}
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Brouillons"
                      value={kpi.draft}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Archivés"
                      value={kpi.archived}
                      tone="muted"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ligne mini KPI */}
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
                <MiniKpi
                  label="Total plans"
                  value={kpi.totalCount}
                  isDark={isDark}
                />
                <MiniKpi
                  label="Montant total (€)"
                  value={kpi.totalAmount}
                  format="amount"
                  isDark={isDark}
                />
                <MiniKpi
                  label="Brouillons"
                  value={kpi.draft}
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
                  label="A échoir"
                  value={kpi.A_ECHOIR}
                  isDark={isDark}
                />
                <MiniKpi
                  label="Terme échu"
                  value={kpi.TERME_ECHU}
                  isDark={isDark}
                />
              </div>

              {/* Bloc KPI détaillés */}
              {showKpis && (
                <Card className={sectionCardClass}>
                  <CardContent className="p-4 space-y-4">
                    {showKpiFilters && (
                      <KpiDashboard
                        kpiFilters={kpiFilters}
                        setKpiFilters={setKpiFilters}
                        customerSearch={customerSearch}
                        setCustomerSearch={setCustomerSearch}
                        showCustomerList={showCustomerList}
                        setShowCustomerList={setShowCustomerList}
                        customerOptions={customerOptionsForKpi}
                        kpi={kpi}
                        paymentsByDay={paymentsByDayProRata}
                        donutData={donutData}
                        COLORS={COLORS}
                      />
                    )}

                    <KpiCounters kpi={kpi} />

                    <KpiCharts
                      paymentsByDay={paymentsByDayProRata}
                      donutData={donutData}
                      COLORS={COLORS}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Filtres + table des plans */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4 space-y-4">
                  <FiltersCard
                    filters={filters}
                    setFilters={setFilters}
                    customerOptions={customerOptionsClean}
                    showCustomerList={showCustomerList}
                    setShowCustomerList={setShowCustomerList}
                    handleRefresh={handleRefresh}
                  />

                  <Card className="border-none shadow-none">
                    <CardContent className="p-0">
                      {isLoading ? (
                        <div
                          className={cn(
                            "flex items-center justify-center p-4 text-sm",
                            mutedText,
                          )}
                        >
                          Chargement des plans de facturation...
                        </div>
                      ) : (
                        <BillingSchedulesTable
                          rows={paginatedSchedules}
                          total={totalSchedules}
                          limit={limit}
                          offset={offset}
                          onChangePage={(newLimit, newOffset) => {
                            setFilters((prev) => ({
                              ...prev,
                              limit: newLimit,
                              offset: newOffset,
                            }));
                          }}
                          onView={handleViewSchedule}
                          onEdit={() => null}
                          onDelete={(row) => handleDeleteSchedule(row.id)}
                          onDownload={handleDownloadSchedule}
                          onExportExcel={handleExportExcel}
                          downloadingId={downloadingId}
                          exportingId={exportingId}
                          // Si BillingSchedulesTable permet de sélectionner un plan :
                          // onSelectedChange={setSelectedSchedule}
                        />
                      )}

                      <div className="p-4">
                        {currentScheduleId && (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <div className={cn("text-sm", secondaryText)}>
                                Lignes du plan{" "}
                                <span className="font-semibold">
                                  {currentScheduleId}
                                </span>
                              </div>
                            </div>
                            <BillingLinesTable
                              rows={selectedSchedule?.lines ?? []}
                              tvaRate={selectedSchedule?.tvaRate}
                              onEdit={() => {
                                toast({
                                  title: "Action d'édition",
                                  description:
                                    "Brancher ici la modale d'édition de ligne si nécessaire.",
                                });
                              }}
                              onDelete={() => {
                                toast({
                                  title: "Action de suppression",
                                  description:
                                    "Brancher ici la suppression de ligne (ou une modale de confirmation).",
                                });
                              }}
                            />
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          );
        }}
      </KlyxorPageLayout>

      {/* Dialogs Plans */}
      <ViewBillingScheduleDialog
        open={openView}
        onOpenChange={(v) => {
          setOpenView(v);
          if (!v) setViewingSchedule(null);
        }}
        schedule={viewingSchedule}
        onScheduleUpdate={(updatedSchedule) => {
          setViewingSchedule(updatedSchedule);
        }}
      />

      <DeleteBillingScheduleDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        bs={selectedSchedule}
      />

      {openView && viewLoading && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="rounded-md bg-[#142B46] text-kly-text-primary shadow px-4 py-2 text-sm border border-white/20">
            Chargement des détails…
          </div>
        </div>
      )}
    </>
  );
}

/* === Petits composants KPI pour le hero / mini-ligne === */

function HeroKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "muted";
  isDark: boolean;
}) {
  const bg =
    tone === "warning"
      ? isDark
        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
        : "bg-amber-50 border-amber-200 text-amber-700"
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
        {value.toLocaleString("fr-FR", {
          maximumFractionDigits: 0,
        })}
      </span>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone = "default",
  format: formatType = "count",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  format?: "count" | "amount";
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

  const displayValue =
    formatType === "amount"
      ? value.toLocaleString("fr-FR", {
          maximumFractionDigits: 0,
        })
      : value ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
        bg,
      )}
    >
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{displayValue}</span>
      </div>
    </div>
  );
}
