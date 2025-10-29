// src/modules/billing/components/BillingLinesTable.tsx
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { BillingLine } from "../domain/types";

export function BillingLinesTable({
  rows,
  onEdit,
  onDelete,
  height = "400px",
}: {
  rows: BillingLine[];
  onEdit: (row: BillingLine) => void;
  onDelete: (row: BillingLine) => void;
  height?: string;
}) {
  return (
    <div className="w-full overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr className="text-left">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Échéance</th>
            <th className="px-4 py-2">Montant HT</th>
            <th className="px-4 py-2">Statut</th>
            <th className="px-4 py-2 w-[120px] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{l.sequenceNo}</td>
              <td className="px-4 py-2">
                {new Date(l.dueDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">
                {Intl.NumberFormat(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(l.amountHt)}
              </td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {l.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(l)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(l)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                Aucune ligne trouvée
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
