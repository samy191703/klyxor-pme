import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import type { BillingSchedule } from "../domain/types";
import {
  BILLING_FREQUENCY_LABELS,
  BILLING_TYPE_LABELS,
  BILLING_STATUS_LABELS,
} from "../domain/constants";

export function BillingSchedulesTable({
  rows,
  onView,
  onEdit,
  onDelete,
  onDownload,
  downloadingId,
  height = "400px",
}: {
  rows: BillingSchedule[];
  onView: (row: BillingSchedule) => void;
  onEdit: (row: BillingSchedule) => void;
  onDelete: (row: BillingSchedule) => void;
  onDownload: (row: BillingSchedule) => void;
  downloadingId?: string | null;
  height?: string;
}) {
  return (
    <div className="w-full overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr className="text-left">
            <th className="px-4 py-2">Contrat</th>
            <th className="px-4 py-2">Période</th>
            <th className="px-4 py-2">Fréquence</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Version</th>
            <th className="px-4 py-2">Statut</th>
            <th className="px-4 py-2 w-[140px] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isDownloading = downloadingId === r.id;

            return (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                {/* Contrat */}
                <td className="px-4 py-2 font-medium text-gray-900">
                  <span
                    title={r.contractNumber ?? r.contractId}
                    className="inline-block max-w-[260px] truncate align-middle"
                  >
                    {r.contractNumber ?? r.contractId}
                  </span>
                </td>

                {/* Période */}
                <td className="px-4 py-2">
                  {new Date(r.startDate).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(r.endDate).toLocaleDateString("fr-FR")}
                </td>

                {/* Fréquence (label) */}
                <td className="px-4 py-2">
                  {BILLING_FREQUENCY_LABELS[r.frequency] ?? r.frequency}
                </td>

                {/* Type (label) */}
                <td className="px-4 py-2">
                  {BILLING_TYPE_LABELS[r.billingType] ?? r.billingType}
                </td>

                {/* Version */}
                <td className="px-4 py-2">{r.version}</td>

                {/* Statut (label + badge) */}
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      r.status === "active"
                        ? "bg-green-100 text-green-700"
                        : r.status === "draft"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {BILLING_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    {/* Télécharger PDF */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(r)}
                      title="Télécharger l’échéancier (PDF)"
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(r)}
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(r)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(r)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                Aucun échéancier trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
