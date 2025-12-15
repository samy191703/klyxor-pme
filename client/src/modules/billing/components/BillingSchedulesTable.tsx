// src/modules/billing/components/BillingSchedulesTable.tsx
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Pencil,
  Trash2,
  Download,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

import type { BillingSchedule } from "../domain/types";
import {
  BILLING_FREQUENCY_LABELS,
  BILLING_TYPE_LABELS,
  BILLING_STATUS_LABELS,
} from "../domain/constants";
import { formatDateFR } from "../utils/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  rows: BillingSchedule[];
  total: number;
  limit: number;
  offset: number;
  onChangePage: (newLimit: number, newOffset: number) => void;
  onView: (row: BillingSchedule) => void;
  onEdit: (row: BillingSchedule) => void;
  onDelete: (row: BillingSchedule) => void;
  onDownload: (row: BillingSchedule) => void;
  onExportExcel: (row: BillingSchedule) => void;
  downloadingId?: string | null;
  exportingId?: string | null;
  height?: string | number;
};

// Largeurs de colonnes
const COLS = [
  180, // Contrat
  220, // Période
  140, // Fréquence
  140, // Type
  90, // Version
  140, // Statut
  180, // Actions
] as const;

function StatusChipBilling({ status }: { status: BillingSchedule["status"] }) {
  const label = BILLING_STATUS_LABELS[status] ?? status;

  switch (status) {
    case "active":
      return (
        <Badge className="kly-badge-actif">
          {label}
        </Badge>
      );
    case "draft":
      return (
        <Badge className="kly-badge-brouillon">
          {label}
        </Badge>
      );
    case "archived":
      return (
        <Badge className="kly-badge-cloture">
          {label}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="kly-badge">
          {label}
        </Badge>
      );
  }
}

export function BillingSchedulesTable({
  rows,
  total,
  limit,
  offset,
  onChangePage,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onExportExcel,
  downloadingId,
  exportingId,
  height = 400,
}: Props) {
  const displayedRows = rows;

  const page = limit > 0 ? Math.floor(offset / limit) : 0;
  const totalPages =
    limit > 0 ? Math.max(1, Math.ceil((total || 0) / limit)) : 1;
  const from = total === 0 ? 0 : offset + 1;
  const to = total === 0 ? 0 : Math.min(offset + limit, total);

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && page > 0) {
      onChangePage(limit, (page - 1) * limit);
    }
    if (direction === "next" && page < totalPages - 1) {
      onChangePage(limit, (page + 1) * limit);
    }
  };

  const handleRowsPerPageChange = (value: string) => {
    const newLimit = parseInt(value, 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      onChangePage(newLimit, 0);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="overflow-x-auto"
        style={{ maxHeight: height, overflowY: "auto" }}
      >
        <Table className="text-sm text-kly-text-primary min-w-[1100px]">
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>

          <TableHeader className="kly-table-header">
            <TableRow>
              <TableHead>Contrat</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Fréquence</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLS.length} className="py-6 text-center">
                  <p className="text-sm text-kly-text-secondary">
                    Aucun échéancier trouvé.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((r) => {
                const isDownloading = downloadingId === r.id;
                const isExporting = exportingId === r.id;

                return (
                  <TableRow key={r.id} className="kly-table-row">
                    {/* Contrat */}
                    <TableCell>
                      <span
                        title={r.contractNumber ?? r.contractId ?? undefined}
                        className="inline-block max-w-[164px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                      >
                        {r.contractNumber ?? r.contractId}
                      </span>
                    </TableCell>

                    {/* Période */}
                    <TableCell>
                      {formatDateFR(r.startDate)} — {formatDateFR(r.endDate)}
                    </TableCell>

                    {/* Fréquence */}
                    <TableCell>
                      {BILLING_FREQUENCY_LABELS[r.frequency] ?? r.frequency}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      {BILLING_TYPE_LABELS[r.billingType] ?? r.billingType}
                    </TableCell>

                    {/* Version */}
                    <TableCell>{r.version}</TableCell>

                    {/* Statut */}
                    <TableCell>
                      <StatusChipBilling status={r.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Export Excel */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onExportExcel(r)}
                          disabled={!!isExporting}
                          title="Exporter en Excel"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4" />
                          )}
                        </Button>

                        {/* PDF */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDownload(r)}
                          disabled={!!isDownloading}
                          title="Télécharger l’échéancier (PDF)"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Voir */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onView(r)}
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Modifier */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(r)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Supprimer */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(r)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs text-kly-text-secondary">
        <div>
          {from}–{to} sur {total} plan
          {total > 1 ? "s" : ""}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span>Lignes par page</span>
            <Select
              value={String(limit)}
              onValueChange={handleRowsPerPageChange}
            >
              <SelectTrigger className="w-[80px] h-7 px-2 py-1 text-xs bg-[#1A314E] border-[#274468] text-kly-text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="kly-btn-outline h-7 px-2 text-xs"
              disabled={page <= 0}
              onClick={() => handlePageChange("prev")}
            >
              ← Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="kly-btn-outline h-7 px-2 text-xs"
              disabled={page >= totalPages - 1 || total === 0}
              onClick={() => handlePageChange("next")}
            >
              Suivant →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
