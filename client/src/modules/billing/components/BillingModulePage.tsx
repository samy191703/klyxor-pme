// src/modules/billing/components/BillingModulePage.tsx
import { useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

import type {
  BillingSchedule,
  BillingLine,
  BillingScheduleStatus,
} from "../domain/types";

import { useBillingSchedules } from "../queries/useBillingSchedules";
import { useBillingLinesBySchedule } from "../queries/useBillingLinesBySchedule";

import { BillingSchedulesTable } from "./BillingSchedulesTable";
import { BillingLinesTable } from "./BillingLinesTable";

import { CreateBillingScheduleDialog } from "./CreateBillingScheduleDialog";
import { ViewBillingScheduleDialog } from "./ViewBillingScheduleDialog";
import { EditBillingScheduleDialog } from "./EditBillingScheduleDialog";
import { DeleteBillingScheduleDialog } from "./DeleteBillingScheduleDialog";
import BillingScheduleFilters from "./BillingScheduleFilters";

export default function BillingModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"schedules" | "lines">(
    "schedules"
  );

  const {
    data: schedules = [],
    isLoading,
    error,
    refetch,
  } = useBillingSchedules();

  // Plan sélectionné (alimente l’onglet Lignes)
  const [selectedSchedule, setSelectedSchedule] =
    useState<BillingSchedule | null>(null);

  // Lignes du plan courant
  const currentScheduleId = selectedSchedule?.id ?? null;
  const { data: lines = [] } = useBillingLinesBySchedule(currentScheduleId);

  type ScheduleFiltersValue = {
    search: string;
    status: BillingScheduleStatus | "all";
    itemsPerPage?: number;
  };

  const [filters, setFilters] = useState<ScheduleFiltersValue>({
    search: "",
    status: "all",
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

  const filteredSchedules = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (filters.status !== "all" && s.status !== filters.status) return false;
      if (
        q &&
        !(
          s.id.toLowerCase().includes(q) ||
          s.contractNumber?.toLowerCase().includes(q) ||
          s.contractId.toLowerCase().includes(q)
        )
      )
        return false;
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
              </div>
            </div>
          </div>

          {/* Tabs internes */}
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
          </div>

          {/* KPI – cachés si expanded */}
          {activeTab === "schedules" && showKpis && (
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
          {activeTab === "schedules" && (
            <Card className="mb-3">
              <CardContent className="p-4 flex justify-between items-center gap-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <BillingScheduleFilters
                    value={{
                      status:
                        filters.status === "all"
                          ? ("all" as any)
                          : filters.status,
                      search: filters.search,
                    }}
                    onChange={(patch) =>
                      setFilters((s) => ({
                        ...s,
                        search: patch.search ?? s.search,
                        status:
                          (patch.status as ScheduleFiltersValue["status"]) ??
                          s.status,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center space-x-2 justify-end">
                  <Button variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {activeTab === "schedules" && (
                <BillingSchedulesTable
                  rows={filteredSchedules}
                  onView={handleViewSchedule}
                  onEdit={(row) => {
                    /*   setSelectedSchedule(row);
                    setOpenEdit(true); */
                    null;
                  }}
                  onDelete={(row) => handleDeleteSchedule(row.id)}
                />
              )}

              {activeTab === "lines" && (
                <div className="p-4">
                  {!currentScheduleId && (
                    <div className="text-gray-600">
                      Sélectionnez un plan de facturation pour voir ses lignes.
                    </div>
                  )}
                  {currentScheduleId && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-700">
                          Lignes du plan <b>{currentScheduleId}</b>
                        </div>
                      </div>
                      <BillingLinesTable
                        rows={lines as BillingLine[]}
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
              )}
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
