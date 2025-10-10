"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Eye, EyeOff } from "lucide-react";

import type { ValidationRequest } from "../domain/types";
import { VALIDATION_REQUESTS_QK } from "../domain/constants";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import ValidationRequestFilters, {
  ValidationRequestFiltersValue,
} from "./ValidationRequestFilters";
import ValidationRequestsTable from "./ValidationRequestsTable";

import CreateValidationRequestDialog from "../components/CreateValidationRequestDialog";
import ViewValidationRequestDialog from "../components/ViewValidationRequestDialog";

// ⬇️ your existing hooks layer (already wraps the service)
import {
  useValidationRequests,
  useApproveValidationRequest,
  useRejectValidationRequest,
  useRedirectValidationRequest,
} from "../queries/hooks";

export default function ValidationRequestsPage() {
  const { data: vrList = [], isLoading, refetch } = useValidationRequests();

  // Optionnel (parité avec Terminations)
  const { data: contracts = [] } = useQuery({
    queryKey: VALIDATION_REQUESTS_QK.contracts,
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Chargement des demandes de validation...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-50"
      data-testid="validation-requests-main"
    >
      <Header />

      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          {/* Header zone */}
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Demandes de Validation
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérer les demandes et leur workflow de validation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-validation-request"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>

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
                { v: kpis.pending, l: "En attente", c: "text-yellow-600" },
                {
                  v: kpis.approved30,
                  l: "Approuvées (30 j)",
                  c: "text-green-600",
                },
                { v: kpis.rejected, l: "Rejetées", c: "text-red-600" },
                { v: kpis.redirected, l: "Redirigées", c: "text-blue-600" },
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
                <ValidationRequestFilters
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
              <ValidationRequestsTable
                rows={filtered}
                height={expanded ? "500px" : "400px"}
                onView={(v) => setSelected(v)}
                onApprove={(v) => setSelected(v)}
                onReject={(v) => setSelected(v)}
                onRedirect={(v) => setSelected(v)}
              />
            </CardContent>
          </Card>
        </div>
      </main>

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
          // TODO: replace with a proper user picker for 'assignedTo'
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
    </div>
  );
}
