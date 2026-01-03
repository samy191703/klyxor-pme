// src/modules/amendments/components/AmendmentsPage.tsx
import { useState, useMemo } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Maximize2,
  Minimize2,
  EyeIcon,
  EyeClosedIcon,
  EyeOffIcon,
} from "lucide-react"; // ⬅️ NEW
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

export default function AmendmentsPage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const { data: amendments = [], isLoading, error, refetch } = useAmendments();
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

  // ⬇️ NEW: control KPI visibility and table expansion
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
      )
        return false;
      return true;
    });
  }, [amendments, filters]);

  /*   const paged = useMemo(
    () => filtered.slice(0, filters.itemsPerPage),
    [filtered, filters.itemsPerPage]
  ); */

  const handleDelete = async (id: string) => {
    if (
      !canDeleteContract() ||
      !confirm("Êtes-vous sûr de vouloir supprimer cet avenant ?")
    )
      return;
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
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avenant",
        variant: "destructive",
      });
    }
  };

  // ⬇️ NEW: toggle expansion (also bump itemsPerPage)
  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      setShowKpis(!next ? true : false); // hide KPIs when expanded, show when collapsed
      setFilters((s) => ({ ...s, itemsPerPage: next ? 25 : 100 })); // more items when expanded
      return next;
    });
  };

  // ⬇️ NEW: refresh → then expand and collapse KPIs
  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
    setFilters((s) => ({ ...s }));
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Chargement des avenants...
      </div>
    );

  if (error) {
    console.log(error);
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

  return (
    <div
      className="flex flex-col h-full bg-gray-50"
      data-testid="amendments-main"
    >
      <Header />
      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Avenants
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérer les différentes mises à jour de vos termes de contrats
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-amendment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel avenant
                </Button>
                {/* ⬇️ NEW expand/collapse button */}
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
                  {expanded ? "Statistiques" : "Statistiques"}
                </Button>
              </div>
            </div>
          </div>

          {/* KPI – hidden when expanded */}
          {showKpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
              {[
                { v: kpi.total, l: "Total avenants", c: "" },
                { v: kpi.drafts, l: "Brouillons", c: "text-gray-600" },
                { v: kpi.pending, l: "À signer", c: "text-yellow-600" },
                { v: kpi.active, l: "Actifs", c: "text-green-600" },
                { v: kpi.rejected, l: "Rejetés", c: "text-red-600" },
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

          {/* Filters */}
          <Card className="mb-3">
            <CardContent className="p-4 flex justify-between items-center gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <AmendmentFilters
                  value={filters}
                  onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))}
                />
              </div>

              <div className="flex items-center space-x-2 justify-end">
                {/* ⬇️ NEW: refresh that collapses KPIs & expands table after fetching */}
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <AmendmentsTable
                rows={filtered}
                height={expanded ? "500px" : "400px"} // ⬅️ expand height when expanded
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
              {/*    {filtered.length > 0 && (
                <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    1-{Math.min(filters.itemsPerPage, filtered.length)} sur{" "}
                    {filtered.length}
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateAmendmentDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        contracts={contracts as ContractRef[]}
        canCreate={canCreateContract()}
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
        canEdit={canModifyContract()}
      />
    </div>
  );
}
