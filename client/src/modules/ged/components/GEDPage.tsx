// src/_app/ged/components/GEDPage.tsx
"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useDocuments } from "../queries/useDocuments";
import type { GEDFilters, UploadDocument } from "../domain/types";

import GEDFiltersBar from "./GEDFilters";
import GEDList from "./GEDList";
import GEDDetailsSheet from "./GEDDetailsSheet";

import { useDeleteDocument } from "../queries/useDeleteDocument";
import { useUpdateDocument } from "../queries/useUpdateDocument";

import ConfirmDeleteModal from "./modals/ConfirmDeleteModal";
import EditMetadataDialog from "./modals/EditMetaDataDialog";
import CreateDocumentDialog from "./modals/CreateDocumentDialog";
import { AttachFile } from "@mui/icons-material";

export default function GEDPage() {
  const { data: docs = [], isLoading, refetch } = useDocuments();

  // Fetch contracts for the upload dialog
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
  });

  const [filters, setFilters] = useState<GEDFilters>({
    search: "",
    type: "all",
    author: "all",
  });

  const [selected, setSelected] = useState<UploadDocument | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const del = useDeleteDocument();
  const upd = useUpdateDocument();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // NEW: Create (upload) dialog
  const [openCreate, setOpenCreate] = useState(false);

  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const authors = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => d.uploadedBy && set.add(d.uploadedBy));
    return Array.from(set);
  }, [docs]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const total = docs.length;
    const last30 = docs.filter((d) => {
      if (!d.uploadedAt) return false;
      return now - new Date(d.uploadedAt).getTime() <= THIRTY_DAYS;
    }).length;
    const confidential = docs.filter((d) => d.isConfidential).length;
    const deleted = docs.filter((d) => d.status === "deleted").length;

    return { total, last30, confidential, deleted };
  }, [docs]);

  const filtered = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();

    return docs.filter((d) => {
      if (filters.type !== "all" && String(d.type) !== filters.type)
        return false;

      if (
        filters.author &&
        filters.author !== "all" &&
        (d.uploadedBy ?? "").toLowerCase() !== filters.author.toLowerCase()
      )
        return false;

      if (
        q &&
        !(
          (d.id ?? "").toLowerCase().includes(q) ||
          (d.name ?? "").toLowerCase().includes(q) ||
          (String(d.type) ?? "").toLowerCase().includes(q) ||
          (String(d.category) ?? "").toLowerCase().includes(q) ||
          (d.uploadedBy ?? "").toLowerCase().includes(q)
        )
      )
        return false;

      return true;
    });
  }, [docs, filters]);

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
        Chargement des documents...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50" data-testid="ged-main">
      <Header />

      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          {/* Header zone */}
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Documents
                </h1>
                <p className="text-gray-600 mt-1">
                  Centraliser, filtrer et consulter les pièces jointes
                </p>
              </div>

              <div className="flex gap-2">
                {/* NEW: Create (upload) button */}
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-document"
                >
                  {/* <Plus className="h-4 w-4 mr-2" /> */}
                  <AttachFile className="h-4 w-4 mr-2" />
                  Joindre un document
                </Button>

                {/* KPI expand/collapse */}
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

          {/* KPIs */}
          {showKpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
              {[
                { v: kpis.total, l: "Total", c: "text-gray-600" },
                { v: kpis.last30, l: "Ajoutés (30 j)", c: "text-blue-600" },
                {
                  v: kpis.confidential,
                  l: "Confidentiels",
                  c: "text-purple-600",
                },
                { v: kpis.deleted, l: "Supprimés", c: "text-red-600" },
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
                <GEDFiltersBar
                  value={filters}
                  onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))}
                  authors={authors}
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
              <GEDList
                items={filtered}
                height={showKpis ? 320 : 420}
                onPreview={(doc) => {
                  setSelected(doc);
                  setDetailsOpen(true);
                }}
                onDelete={(doc) => {
                  setSelected(doc);
                  setConfirmOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Details sheet */}
      <GEDDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        doc={selected}
        onDelete={() => {
          setDetailsOpen(false);
          setConfirmOpen(true);
        }}
      />

      {/* Confirm delete */}
      <ConfirmDeleteModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (!selected) return;
          await del.mutateAsync(selected.id);
          setConfirmOpen(false);
          setSelected(null);
        }}
      />

      {/* Edit metadata */}
      <EditMetadataDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        doc={selected}
        loading={upd.isPending}
        onSubmit={async ({ name, type, category, description }) => {
          if (!selected) return;
          await upd.mutateAsync({
            id: selected.id,
            data: {
              name,
              type,
              category,
              metadata: { ...(selected.metadata ?? {}), description },
            },
          });
          setEditOpen(false);
        }}
      />

      {/* NEW: Create (upload) dialog */}
      <CreateDocumentDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        contracts={contracts as any}
      />
    </div>
  );
}
