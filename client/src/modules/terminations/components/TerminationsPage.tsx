// src/modules/terminations/components/TerminationsPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query"; // ⬅️ add this
import Header from "@/components/layout/header";
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
import { TERMINATIONS_QK } from "../domain/constants"; // ⬅️ add this
// ⬅️ add this (or reuse your contract type)

export default function TerminationsPage() {
  const { data: terminations = [], isLoading, refetch } = useTerminations();

  // 🔹 Fetch contracts (same style as AmendmentsPage)
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

  // KPIs + expansion controls
  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // ----- FIX: compute KPIs from real fields -----
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

    return { drafts, toValidate, validated30, rejected };
  }, [terminations]);

  // ----- FIX: filters mapped to real fields -----
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
      setShowKpis(!next);
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Chargement des résiliations...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-50"
      data-testid="terminations-main"
    >
      <Header />

      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          {/* Header zone */}
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Résiliations
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérer les demandes de résiliation et leur workflow de
                  validation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-termination"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle résiliation
                </Button>

                {/* Expand/Collapse KPIs */}
                <Button
                  variant="outline"
                  onClick={toggleExpand}
                  title={expanded ? "Réduire" : "Agrandir le tableau"}
                >
                  {expanded ? (
                    <Eye className="w-4 h-4 mr-2" />
                  ) : (
                    <EyeOff className="w-4 h-4 mr-2" />
                  )}
                  Statistiques
                </Button>
              </div>
            </div>
          </div>

          {/* KPIs — hidden when expanded */}
          {showKpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
              {[
                { v: kpis.drafts, l: "Brouillons", c: "text-gray-600" },
                { v: kpis.toValidate, l: "À valider", c: "text-yellow-600" },
                {
                  v: kpis.validated30,
                  l: "Validées (30 j)",
                  c: "text-green-600",
                },
                { v: kpis.rejected, l: "Rejetées", c: "text-red-600" },
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

          {/* Filters + refresh */}
          <Card className="mb-3">
            <CardContent className="p-4 flex justify-between items-stretch gap-[100px]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                <TerminationFilters
                  value={filters}
                  onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))}
                />
              </div>

              <div className="flex items-start space-x-2 justify-end">
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
      </main>

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
    </div>
  );
}
