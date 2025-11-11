// src/modules/billing/components/BillingModulePage.tsx
import { Key, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  EyeIcon,
  EyeOffIcon,
  Search,
  FileText,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Filter } from "lucide-react";

import type {
  BillingSchedule,
  BillingLine,
  BillingScheduleStatus,
  BillingScheduleWithLines,
} from "../domain/types";

import { useBillingSchedules } from "../queries/useBillingSchedules";
import { useBillingLinesBySchedule } from "../queries/useBillingLinesBySchedule";

import {
  BillingSchedulesQuery,
  downloadBillingSchedulePdf,
  fetchBillingScheduleWithLines,
} from "../api/billing.api";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  Pie,
  PieChart,
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  addMonths,
} from "date-fns";
import { useBillingKpis } from "../queries/useBillingKpis";
import { BillingFrequency } from "@shared/enums/billing.enum";
import { useContracts } from "@/hooks/contrats/useContracts";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BillingLinesTable } from "../components/BillingLinesTable";
import { BillingSchedulesTable } from "../components/BillingSchedulesTable";
import { DeleteBillingScheduleDialog } from "../components/dialogs/DeleteBillingScheduleDialog";
import ViewBillingScheduleDialog from "../components/dialogs/ViewBillingScheduleDialog";
import { BILLING_STATUS_LABELS, DEFAULT_FILTERS } from "../domain/constants";
import FiltersCard from "../components/FiltersCard";
import { KpiCharts } from "../components/KpiCharts";
import { KpiCounters } from "../components/KpiCounters";
import { KpiDashboard } from "../components/KpiDashboard";
import { PaginationControls } from "../components/PaginationControls";
import {
  exportBillingSchedulesListToExcel,
  exportBillingScheduleToExcel,
} from "../utils/export-excel";

export default function BillingModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  /*  const [activeTab, setActiveTab] = useState<"schedules" | "lines">(
    "schedules"
  );
 */
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const {
    data: schedulesData,
    isLoading,
    error,
    refetch,
  } = useBillingSchedules(filters);
  console.log("schedulesData:", schedulesData);

  const schedules = schedulesData?.rows ?? [];
  const totalSchedules = schedulesData?.total ?? 0;

  const limit = filters.limit ?? 25; 
  const offset = filters.offset ?? 0;  


  // Plan sélectionné (alimente l’onglet Lignes)
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

  const rootStyles = getComputedStyle(document.documentElement);

  const COLORS = [
    rootStyles.getPropertyValue("--klyxor-bleu-nuit").trim(),
    rootStyles.getPropertyValue("--klyxor-or").trim(),
    rootStyles.getPropertyValue("--klyxor-blanc").trim(),
  ];


  useEffect(() => {
    const handler = () => setShowCustomerList(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

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

  // ID de l’échéancier en cours de téléchargement
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ID de l’échéancier en cours d’export Excel
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

  // useMemo KPI
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

  // useMemo Graphe
  const paymentsByDay = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];

    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start, end });

    const data = daysInMonth.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      totalAmount: 0,
    }));

    schedules.forEach((schedule) => {
      if (!schedule.lines || schedule.lines.length === 0) return;

      const totalScheduleAmount = (schedule.lines as BillingLine[]).reduce(
        (sum: number, line: BillingLine) => sum + (Number(line.amountHt) || 0),
        0
      );

      let numPayments = 1;
      switch (schedule.frequency) {
        case BillingFrequency.MONTHLY:
          numPayments = 12;
          break;
        case BillingFrequency.QUARTERLY:
          numPayments = 4;
          break;
        case BillingFrequency.SEMIANNUAL:
          numPayments = 2;
          break;
        case BillingFrequency.ANNUAL:
          numPayments = 1;
          break;
      }

      const paymentAmount = totalScheduleAmount / numPayments;

      let paymentDates: Date[] = [];
      const startDate = parseISO(schedule.startDate);
      for (let i = 0; i < numPayments; i++) {
        let payDate: Date;
        switch (schedule.frequency) {
          case BillingFrequency.MONTHLY:
            payDate = addMonths(startDate, i);
            break;
          case BillingFrequency.QUARTERLY:
            payDate = addMonths(startDate, i * 3);
            break;
          case BillingFrequency.SEMIANNUAL:
            payDate = addMonths(startDate, i * 6);
            break;
          case BillingFrequency.ANNUAL:
            payDate = addMonths(startDate, i * 12);
            break;
          default:
            payDate = startDate;
        }
        paymentDates.push(payDate);
      }

      paymentDates.forEach((pd) => {
        if (pd >= start && pd <= end) {
          const dayData = data.find((d) => d.date === format(pd, "yyyy-MM-dd"));
          if (dayData) dayData.totalAmount += paymentAmount;
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
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du Chargement{(error as Error).message}
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-gray-50" data-testid="billing-main">
      <Header />
      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          {/* En-tête de page + actions */}
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion de la Facturation
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérer les plans de facturation et leurs lignes
                </p>
              </div>
              <div className="flex gap-2">
                {/* <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-billing-schedule"
                  disabled={!canCreateContract()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau plan
                </Button> */}
                <Button
                  variant="outline"
                  onClick={toggleExpand}
                  title={expanded ? "Réduire" : "Agrandir le tableau"}
                >
                  {expanded ? (
                    <EyeIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <EyeOffIcon className="w-4 h-4 mr-2" />
                  )}
                  Statistiques
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKpiFilters((v) => !v)}
                  className="rounded-lg hover:bg-blue-50 text-blue-600 border-blue-300 relative"
                  title="Afficher / masquer les filtres KPI"
                >
                  <Filter className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                </Button>
              </div>
            </div>
          </div>
          {/* Tabs internes */}
          {/* 
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={activeTab === "schedules" ? "default" : "outline"}
              onClick={() => setActiveTab("schedules")}
            >
              Plans
            </Button>
            <Button
              variant={activeTab === "lines" ? "default" : "outline"}
              onClick={() => setActiveTab("lines")}
              disabled={!currentScheduleId}
              title={
                !currentScheduleId ? "Sélectionnez un plan de facturation" : ""
              }
            >
              Lignes
            </Button>
          </div> */}

          {showKpis && (
            <div>
              {showKpiFilters && (
                // KpiDashboard
                <KpiDashboard
                  kpiFilters={kpiFilters}
                  setKpiFilters={setKpiFilters}
                  customerSearch={customerSearch}
                  setCustomerSearch={setCustomerSearch}
                  showCustomerList={showCustomerList}
                  setShowCustomerList={setShowCustomerList}
                  customerOptions={customerOptions.filter(
                    (c): c is string => c !== undefined
                  )}
                  kpi={kpi}
                  paymentsByDay={paymentsByDay}
                  donutData={donutData}
                  COLORS={COLORS}
                />
              )}

              {/* KpiCounters */}
              <KpiCounters kpi={kpi} />

              {/* KpiCharts */}
              <KpiCharts
                paymentsByDay={paymentsByDay}
                donutData={donutData}
                COLORS={COLORS}
              />
            </div>
          )}

          {/* Table */}
          <FiltersCard
            filters={filters}
            setFilters={setFilters}
            customerOptions={customerOptionsClean}
            showCustomerList={showCustomerList}
            setShowCustomerList={setShowCustomerList}
            handleRefresh={handleRefresh}
          />

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-4 text-gray-500">
                  Chargement des plans de facturation...
                </div>
              ) : (
                // Pagination Controls
               <BillingSchedulesTable
                  rows={paginatedSchedules}
                  total={totalSchedules}
                  limit={limit}
                  offset={offset}
                  onChangePage={(newLimit, newOffset) => {
                    setFilters((prev) => ({ ...prev, limit: newLimit, offset: newOffset }));
                  }}
                  onView={handleViewSchedule}
                  onEdit={(row) => null}
                  onDelete={(row) => handleDeleteSchedule(row.id)}
                  onDownload={handleDownloadSchedule}
                  onExportExcel={handleExportExcel}
                  downloadingId={downloadingId}
                  exportingId={exportingId}
                />
              )}
              <div className="p-4">
                {/* {!currentScheduleId && (
                  <div className="text-gray-600">
                    Sélectionnez un plan de facturation pour voir ses lignes.
                  </div>
                )} */}
                {currentScheduleId && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-700">
                        Lignes du plan <b>{currentScheduleId}</b>
                      </div>
                    </div>
                    <BillingLinesTable
                      rows={selectedSchedule?.lines ?? []}
                      onEdit={() => {
                        toast({
                          title: "Action d’édition",
                          description:
                            "Brancher ici la modale d’édition de ligne si nécessaire.",
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
        </div>
      </main>

      {/* Dialogs Plans */}
      {/* <CreateBillingScheduleDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
      /> */}

      <ViewBillingScheduleDialog
        open={openView}
        onOpenChange={(v) => {
          setOpenView(v);
          if (!v) setViewingSchedule(null);
        }}
        schedule={viewingSchedule}
      />

      {/* <EditBillingScheduleDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        bs={selectedSchedule}
      /> */}
      <DeleteBillingScheduleDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        bs={selectedSchedule}
      />

      {openView && viewLoading && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="rounded-md bg-white shadow px-4 py-2 text-sm text-gray-700 border">
            Chargement des détails…
          </div>
        </div>
      )}
    </div>
  );
}
