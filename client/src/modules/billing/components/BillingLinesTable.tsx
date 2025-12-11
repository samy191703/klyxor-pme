// src/modules/billing/components/BillingLinesTable.tsx
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, FileText } from "lucide-react";
import type { BillingLine } from "../domain/types";

export function BillingLinesTable({
  rows,
  onEdit,
  onDelete,
  height = "400px",
  tvaRate,
  indexedAmounts,
}: {
  rows: BillingLine[];
  onEdit: (row: BillingLine) => void;
  onDelete: (row: BillingLine) => void;
  height?: string;
  tvaRate?: number | null;
  indexedAmounts?: Record<string, number | null>; // Map of billing line ID to indexed amount
}) {
  const formatMoney = (amount: number) => {
    return Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateShort = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="w-full overflow-x-auto" style={{ maxHeight: height }}>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50 border-b-2 border-gray-200 z-10">
          <tr className="text-left">
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[50px] border-r border-gray-200">
              #
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[160px]">
              PÉRIODE FACTURÉE
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
              ÉCHÉANCE
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right min-w-[110px]">
              MONTANT HT
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right min-w-[110px]">
              MONTANT TTC
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right min-w-[110px] hidden lg:table-cell">
              MONTANT TVA
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right min-w-[120px] hidden lg:table-cell">
              MONTANT INDEXÉ
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px] hidden xl:table-cell">
              DATE FACTURE
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
              STATUT
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right min-w-[100px] sticky right-0 bg-gray-50 z-20 border-l border-gray-200">
              ACTION
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const amountHt = Number(l.amountHt || 0);
            const tvaRateValue = Number(tvaRate ?? 0);
            const tvaAmount = amountHt * tvaRateValue;
            const ttcAmount = amountHt + tvaAmount;
            const indexedAmount = indexedAmounts?.[l.id] ?? null;

            return (
              <tr key={l.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                <td className="px-3 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                  {l.sequenceNo}
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">
                  {l.billingStartDate && l.billingEndDate ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap">
                        {formatDate(l.billingStartDate)} — {formatDate(l.billingEndDate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-gray-900 text-xs">
                    {formatDate(l.dueDate)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-bold text-gray-900 text-xs">
                    {formatMoney(amountHt)} €
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-semibold text-gray-900 text-xs">
                    {formatMoney(ttcAmount)} €
                  </span>
                </td>
                <td className="px-3 py-3 text-right hidden lg:table-cell">
                  <span className="font-medium text-gray-700 text-xs">
                    {formatMoney(tvaAmount)} €
                  </span>
                </td>
                <td className="px-3 py-3 text-right hidden lg:table-cell">
                  {indexedAmount != null ? (
                    <span className="font-bold text-blue-700 text-xs">
                      {formatMoney(indexedAmount)} €
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs hidden xl:table-cell">
                  {l.invoiceDate ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-700 font-medium border border-green-200">
                      <FileText className="h-3 w-3" />
                      {formatDate(l.invoiceDate)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    l.status === "DRAFT"
                      ? "bg-gray-100 text-gray-800 border border-gray-200"
                      : l.status === "A_FACTURER"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : l.status === "FACTUREE"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : l.status === "ANNULEE"
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {l.status === "DRAFT" ? "Brouillon" 
                      : l.status === "A_FACTURER" ? "À facturer"
                      : l.status === "FACTUREE" ? "Facturée"
                      : l.status === "ANNULEE" ? "Annulée"
                      : l.status}
                  </span>
                </td>
                <td className="px-3 py-3 sticky right-0 bg-white z-10 border-l border-gray-100">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(l)}
                      title="Modifier"
                      className="h-8 w-8 hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(l)}
                      title="Supprimer"
                      className="h-8 w-8 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-12 text-center text-gray-500" colSpan={10}>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm">Aucune ligne trouvée</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
