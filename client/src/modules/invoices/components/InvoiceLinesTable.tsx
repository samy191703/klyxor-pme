// src/modules/invoice/components/InvoicesTable.tsx
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import type { Invoice } from "../domain/types";

export function InvoicesTable({
  rows,
  onView,
  onDelete,
  height = "400px",
}: {
  rows: Invoice[];
  onView: (row: Invoice) => void;
  onDelete: (row: Invoice) => void;
  height?: string;
}) {
  const formatMoney = (amount: number | string) => {
    const value = Number(amount ?? 0);
    return Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: height }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr className="text-left">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">N° Facture</th>
            <th className="px-4 py-2">Contrat</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Montant TTC</th>
            <th className="px-4 py-2">Statut</th>
            <th className="px-4 py-2 w-[120px] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{inv.invoiceNumber}</td>
              <td className="px-4 py-2">{inv.invoiceNumber}</td>
              <td className="px-4 py-2">{inv.contractNumber}</td>
              <td className="px-4 py-2">{inv.clientName}</td>
              <td className="px-4 py-2">{formatMoney(inv.totalAmount)}</td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {inv.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(inv)}
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(inv)}
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
              <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                Aucune facture trouvée
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
