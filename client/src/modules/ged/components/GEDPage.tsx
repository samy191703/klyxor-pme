// client/src/modules/ged/GEDPage.tsx

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  FileText,
  RefreshCw,
  Upload,
} from "lucide-react";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";

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

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// -----------------------------------------------------------------------------
// Page principale GED – ISO “Gestion des contrats”
// -----------------------------------------------------------------------------

export default function GEDPage() {
  const { toast } = useToast();

  const {
    data: docs = [],
    isLoading,
    refetch,
  } = useDocuments();

  // contrats pour rattacher dans la modale de création
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
  const [openCreate, setOpenCreate] = useState(false);

  // ---------------------------------------------------------------------------
  // Données dérivées
  // ---------------------------------------------------------------------------

  const authors = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => d.uploadedBy && set.add(d.uploadedBy));
    return Array.from(set);
  }, [docs]);

  const kpi = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    let total = 0;
    let added30 = 0;
    let confidential = 0;
    let deleted = 0;

    for (const d of docs as any[]) {
      total++;
      if (d.uploadedAt && now - new Date(d.uploadedAt).getTime() <= THIRTY_DAYS) {
        added30++;
      }
      if (d.isConfidential) confidential++;
      if (d.status === "deleted") deleted++;
    }

    return { total, added30, confidential, deleted };
  }, [docs]);

  const filteredDocs = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();

    return (docs as any[]).filter((d) => {
      if (filters.type !== "all" && String(d.type) !== filters.type) {
        return false;
      }

      if (
        filters.author &&
        filters.author !== "all" &&
        (d.uploadedBy ?? "").toLowerCase() !== filters.author.toLowerCase()
      ) {
        return false;
      }

      if (
        q &&
        !(
          (d.id ?? "").toLowerCase().includes(q) ||
          (d.name ?? "").toLowerCase().includes(q) ||
          (String(d.type) ?? "").toLowerCase().includes(q) ||
          (String(d.category) ?? "").toLowerCase().includes(q) ||
          (d.uploadedBy ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }

      return true;
    });
  }, [docs, filters]);

  // ---------------------------------------------------------------------------
  // Actions header (Actualiser + Joindre un document)
  // ---------------------------------------------------------------------------

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={() =>
            queryClient
              .invalidateQueries({
                queryKey: ["/api/documents"],
              })
              .then(() => refetch())
          }
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>

        <Button
          onClick={() => setOpenCreate(true)}
          className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900"
        >
          <Upload className="h-4 w-4" />
          Joindre un document
        </Button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render avec KlyxorPageLayout (ISO contrats/dashboard)
  // ---------------------------------------------------------------------------

  return (
    <KlyxorPageLayout
      title="Documents & GED"
      subtitle="Vue consolidée des documents, pièces jointes et fichiers contractuels."
      actions={renderHeaderActions}
    >
      {(theme) => {
        const {
          isDark,
          heroCardClass,
          sectionCardClass,
          tableHeaderClass,
          tableRowHoverClass,
          primaryText,
          secondaryText,
          mutedText,
        } = theme;

        const filtersCardClass = sectionCardClass;
        const tableCardClass = sectionCardClass;

        const tableRowClass = (base?: string) =>
          tableRowHoverClass(
            cn(base, isDark ? "border-slate-800" : "border-slate-100"),
          );

        const totalDocs = kpi.total;

        return (
          <>
            {/* HERO – Vue globale des documents (ISO hero contrats) */}
            <Card className={heroCardClass}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr,0.9fr]">
                {/* Bloc gauche : résumé global */}
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Vue globale des documents
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {totalDocs === 0 ? (
                      <>Aucun document en GED pour le moment.</>
                    ) : (
                      <>
                        {totalDocs} document
                        {totalDocs > 1 ? "s" : ""} en GED • {kpi.added30} ajouté
                        {kpi.added30 > 1 ? "s" : ""} sur 30 jours •{" "}
                        {kpi.confidential} confidentiel
                        {kpi.confidential > 1 ? "s" : ""}.
                      </>
                    )}
                  </div>
                </div>

                {/* Bloc droit : 3 stats encadrées (ISO héro contrats) */}
                <div className="grid gap-2 text-xs">
                  <OverviewChip
                    label="Documents référencés"
                    value={kpi.total}
                    icon={<FileText className="h-3.5 w-3.5" />}
                    isDark={isDark}
                  />
                  <OverviewChip
                    label="Ajoutés (30 j)"
                    value={kpi.added30}
                    tone="warning"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    isDark={isDark}
                  />
                  <OverviewChip
                    label="Confidentiels"
                    value={kpi.confidential}
                    tone="danger"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    isDark={isDark}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ligne mini KPI – ISO Dashboard / Contrats */}
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
              <KpiChip
                label="Documents en GED"
                value={kpi.total}
                icon={<FileText className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Ajoutés (30 j)"
                value={kpi.added30}
                icon={<FileText className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Confidentiels"
                value={kpi.confidential}
                icon={<FileText className="h-3.5 w-3.5" />}
                tone="warning"
                isDark={isDark}
              />
              <KpiChip
                label="Supprimés / archivés"
                value={kpi.deleted}
                icon={<FileText className="h-3.5 w-3.5" />}
                tone="danger"
                isDark={isDark}
              />
            </div>

            {/* Tabs – Documents / Historique */}
            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList
                className={cn(
                  "flex gap-6 bg-transparent px-0 pb-0",
                  isDark ? "border-b border-slate-800" : "border-b border-slate-200",
                )}
              >
                <TabsTrigger
                  value="documents"
                  className={cn(
                    "relative pb-3 text-sm font-medium transition-colors",
                    isDark
                      ? "text-slate-300 hover:text-slate-50"
                      : "text-slate-600 hover:text-slate-900",
                    "data-[state=active]:text-slate-900",
                    "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0",
                    "data-[state=active]:after:h-[2px] data-[state=active]:after:w-full",
                    "data-[state=active]:after:bg-slate-900",
                  )}
                >
                  <span>Documents</span>
                  <span className="ml-1 text-xs text-slate-400">
                    ({filteredDocs.length})
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className={cn(
                    "relative pb-3 text-sm font-medium transition-colors",
                    isDark
                      ? "text-slate-300 hover:text-slate-50"
                      : "text-slate-600 hover:text-slate-900",
                    "data-[state=active]:text-slate-900",
                    "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0",
                    "data-[state=active]:after:h-[2px] data-[state=active]:after:w-full",
                    "data-[state=active]:after:bg-slate-900",
                  )}
                >
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Onglet Documents */}
              <TabsContent value="documents" className="space-y-4">
                {/* Filtres – même type de carte que contrats */}
                <Card className={filtersCardClass}>
                  <CardHeader className="px-4 pt-4 pb-0">
                    <CardTitle
                      className={cn(
                        "text-sm font-semibold",
                        primaryText,
                      )}
                    >
                      Recherche et filtres
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <GEDFiltersBar
                        value={filters}
                        onChange={(patch) =>
                          setFilters((s) => ({ ...s, ...patch }))
                        }
                        authors={authors}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "gap-2",
                          isDark
                            ? "border-slate-700 bg-slate-950 text-slate-50"
                            : "border-slate-200 bg-white text-slate-900",
                        )}
                        onClick={() =>
                          queryClient
                            .invalidateQueries({
                              queryKey: ["/api/documents"],
                            })
                            .then(() => refetch())
                        }
                      >
                        <RefreshCw className="h-4 w-4" />
                        Actualiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tableau des documents */}
                <Card className={tableCardClass}>
                  <CardHeader className="px-4 pt-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle
                          className={cn(
                            "text-sm font-semibold",
                            primaryText,
                          )}
                        >
                          Documents stockés ({filteredDocs.length})
                        </CardTitle>
                        <div className={cn("text-[11px]", secondaryText)}>
                          Double-clique ou clique sur une ligne pour ouvrir la
                          fiche documentaire détaillée.
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          mutedText,
                        )}
                      >
                        <span>{totalDocs} document(s) au total</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[70vh]">
                      <GEDList
                        items={filteredDocs}
                        height={420}
                        onPreview={(doc) => {
                          setSelected(doc);
                          setDetailsOpen(true);
                        }}
                        onDelete={(doc) => {
                          setSelected(doc);
                          setConfirmOpen(true);
                        }}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Onglet Historique – placeholder aligné Dashboard */}
              <TabsContent value="history">
                <Card className={tableCardClass}>
                  <CardContent className="p-6 text-sm">
                    <p className={mutedText}>
                      Historique des actions GED (téléversements, suppressions,
                      modifications) – à connecter à vos logs / audit-trail.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Drawer détails GED */}
            <GEDDetailsSheet
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              doc={selected}
              onDelete={() => {
                setDetailsOpen(false);
                setConfirmOpen(true);
              }}
              onEdit={() => setEditOpen(true)}
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
                toast({
                  title: "Document supprimé",
                  description: "Le document a été supprimé de la GED.",
                });
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
                toast({
                  title: "Métadonnées mises à jour",
                  description: "La fiche documentaire a été actualisée.",
                });
              }}
            />

            {/* Create / upload */}
            <CreateDocumentDialog
              open={openCreate}
              onClose={() => setOpenCreate(false)}
              contracts={contracts as any}
            />
          </>
        );
      }}
    </KlyxorPageLayout>
  );
}

/* === Composants KPI/Overview réutilisés – copiés de contracts.tsx === */

function OverviewChip({
  label,
  value,
  icon,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger";
  isDark: boolean;
}) {
  const bg =
    tone === "danger"
      ? isDark
        ? "bg-red-500/15 text-red-100 border-red-500/40"
        : "bg-red-50 text-red-700 border-red-200"
      : tone === "warning"
      ? isDark
        ? "bg-amber-500/15 text-amber-100 border-amber-500/40"
        : "bg-amber-50 text-amber-700 border-amber-200"
      : isDark
      ? "bg-slate-900/60 text-slate-100 border-slate-700/60"
      : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px]",
        bg,
      )}
    >
      {icon && <div className="h-4 w-4 shrink-0">{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}

function KpiChip({
  label,
  value,
  icon,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger";
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
      {icon && <div className="h-4 w-4 shrink-0">{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}
