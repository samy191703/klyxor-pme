// src/modules/billing/components/BillingSchedulesTable.tsx
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { BillingSchedule } from "../domain/types";

export function BillingSchedulesTable({
  rows,
  onView,
  onEdit,
  onDelete,
  height = "400px",
}: {
  rows: BillingSchedule[];
  onView: (row: BillingSchedule) => void;
  onEdit: (row: BillingSchedule) => void;
  onDelete: (row: BillingSchedule) => void;
  height?: string;
}) {
  return (
    <div className="w-full overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr className="text-left">
            {/*  <th className="px-4 py-2 w-[220px]">Échéancier</th> */}
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
          {rows.map((r) => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              {/*   <td className="px-4 py-2 font-medium text-gray-900">
                <span title={r.id} className="font-mono">{r.id}</span>
              </td> */}

              {/* ⬇️ Contract number with tooltip + ellipsis, fallback to contractId */}
              <td className="px-4 py-2 font-medium text-gray-900">
                <span
                  title={r.contractNumber ?? r.contractId}
                  className="inline-block max-w-[260px] truncate align-middle"
                >
                  {r.contractNumber ?? r.contractId}
                </span>
              </td>

              <td className="px-4 py-2">
                {new Date(r.startDate).toLocaleDateString()} →{" "}
                {new Date(r.endDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">{r.frequency}</td>
              <td className="px-4 py-2">{r.billingType}</td>
              <td className="px-4 py-2">{r.version}</td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
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
          ))}
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
