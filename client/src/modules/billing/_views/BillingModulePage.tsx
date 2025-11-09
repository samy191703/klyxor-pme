import { useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, EyeIcon, EyeOffIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

import type {
  BillingSchedule,
  BillingLine,
  BillingScheduleStatus,
  BillingScheduleWithLines,
} from "../domain/types";

import { useBillingSchedules } from "../queries/useBillingSchedules";
import { useBillingLinesBySchedule } from "../queries/useBillingLinesBySchedule";

import { BillingSchedulesTable } from "../components/BillingSchedulesTable";
import { BillingLinesTable } from "../components/BillingLinesTable";

import { CreateBillingScheduleDialog } from "../components/dialogs/CreateBillingScheduleDialog";
import { ViewBillingScheduleDialog } from "../components/dialogs/ViewBillingScheduleDialog";
import { EditBillingScheduleDialog } from "../components/dialogs/EditBillingScheduleDialog";
import { DeleteBillingScheduleDialog } from "../components/dialogs/DeleteBillingScheduleDialog";
import BillingScheduleFilters from "../components/BillingScheduleFilters";

import {
  downloadBillingSchedulePdf,
  fetchBillingScheduleWithLines,
} from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";
import { Contract } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  exportBillingSchedulesListToExcel,
  exportBillingScheduleToExcel,
} from "../utils/export-excel";

export default function BillingModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const {
    data: schedules = [],
    isLoading,
    error,
    refetch,
  } = useBillingSchedules();

  // 🔹 Fetch contracts
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: BILLING_QK.contracts,
  });

  // Plan sélectionné (alimente l’onglet Lignes)
  const [selectedSchedule, setSelectedSchedule] =
    useState<BillingSchedule | null>(null);

  // Lignes du plan courant
  const currentScheduleId = selectedSchedule?.id ?? null;
  const { data: lines = [] } = useBillingLinesBySchedule(currentScheduleId);

  type ScheduleFiltersValue = {
    search: string;
    status: BillingScheduleStatus | "all";
    frequency: "all" | BillingSchedule["frequency"];
    billingType: "all" | BillingSchedule["billingType"];
    version: string;
    itemsPerPage?: number;
  };

  const [filters, setFilters] = useState<ScheduleFiltersValue>({
    search: "",
    status: "all",
    frequency: "all",
    billingType: "all",
    version: "",
    itemsPerPage: 25,
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  // Détail pour la modale "Voir" (avec lignes)
  const [viewingSchedule, setViewingSchedule] = useState<
    (BillingSchedule & { lines?: BillingLine[] }) | null
  >(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  const filteredSchedules = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const v = filters.version.trim();

    return schedules.filter((s) => {
      // Statut
      if (filters.status !== "all" && s.status !== filters.status) return false;

      // Fréquence
      if (filters.frequency !== "all" && s.frequency !== filters.frequency)
        return false;

      // Type
      if (
        filters.billingType !== "all" &&
        s.billingType !== filters.billingType
      )
        return false;

      // Version (match strict sur la valeur)
      if (v && String(s.version) !== v) return false;

      // Recherche ID / contrat
      if (
        q &&
        !(
          s.id.toLowerCase().includes(q) ||
          s.contractNumber?.toLowerCase().includes(q) ||
          s.contractId.toLowerCase().includes(q)
        )
      ) {
        return false;
      }

      return true;
    });
  }, [schedules, filters]);

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

  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      setShowKpis(!next ? true : false);
      setFilters((s) => ({ ...s, itemsPerPage: next ? 25 : 100 }));
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
    setFilters((s) => ({ ...s }));
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

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Chargement des plans de facturation...
      </div>
    );

  if (error) {
    console.log(error);
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du chargement {(error as Error).message}
      </div>
    );
  }

  // KPIs (draft/active/archived)
  const kpi = {
    total: schedules.length,
    drafts: schedules.filter((s) => s.status === "draft").length,
    active: schedules.filter((s) => s.status === "active").length,
    archived: schedules.filter((s) => s.status === "archived").length,
  };

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
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-billing-schedule"
                  disabled={!canCreateContract()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel échéancier
                </Button>
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
              </div>
            </div>
          </div>

          {/* KPI – cachés si expanded */}
          {showKpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
              {[
                { v: kpi.total, l: "Total plans", c: "" },
                { v: kpi.drafts, l: "Brouillons", c: "text-gray-600" },
                { v: kpi.active, l: "Actifs", c: "text-green-600" },
                { v: kpi.archived, l: "Archivés", c: "text-purple-600" },
              ].map((x, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${x.c}`}>{x.v}</div>
                    <div className="text-sm text-gray-600">{x.l}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Filtres + Refresh */}
          <Card className="mb-3">
            <CardContent className="p-4 flex justify-between items-center gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <BillingScheduleFilters
                  value={{
                    search: filters.search,
                    status: filters.status as any, // "all" | "draft" | "active" | "archived"
                    frequency: filters.frequency,
                    billingType: filters.billingType,
                    version: filters.version,
                  }}
                  onChange={(patch) =>
                    setFilters((s) => ({
                      ...s,
                      search: patch.search ?? s.search,
                      status:
                        (patch.status as ScheduleFiltersValue["status"]) ??
                        s.status,
                      frequency:
                        (patch.frequency as ScheduleFiltersValue["frequency"]) ??
                        s.frequency,
                      billingType:
                        (patch.billingType as ScheduleFiltersValue["billingType"]) ??
                        s.billingType,
                      version: patch.version ?? s.version,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2 justify-end">
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportAllExcel}
                  disabled={exportingAll}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportingAll ? "Export en cours..." : "Exporter EXCEL"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <BillingSchedulesTable
                rows={filteredSchedules}
                onView={handleViewSchedule}
                onEdit={(row) => {
                  /* setSelectedSchedule(row);
                     setOpenEdit(true); */
                  null;
                }}
                onDelete={(row) => handleDeleteSchedule(row.id)}
                onDownload={handleDownloadSchedule}
                onExportExcel={handleExportExcel}
                downloadingId={downloadingId}
                exportingId={exportingId}
              />

              {/* bloc Lignes désactivé pour l'instant */}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs Plans */}
      <CreateBillingScheduleDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        contracts={contracts}
      />
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
