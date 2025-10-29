// src/modules/billing/components/ViewBillingScheduleDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BillingSchedule, BillingLine } from "../domain/types";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";
import { BILLING_STATUS_LABELS } from "../domain/constants";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule?: (BillingSchedule & { lines?: BillingLine[] }) | null;
};

export function ViewBillingScheduleDialog({
  open,
  onOpenChange,
  schedule,
}: Props) {
  if (!schedule) return null;

  const {
    contractNumber,
    startDate,
    endDate,
    frequency,
    billingType,
    version,
    status,
    createdAt,
    updatedAt,
    lines = [],
  } = schedule;

  const statusLabel = BILLING_STATUS_LABELS[status] ?? status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          {/* ⬇️ Title shows contractNumber as requested */}
          <DialogTitle>
            Détails du Plan de facturation : {contractNumber ?? "—"}
          </DialogTitle>
          <DialogDescription>
            {frequency} / {billingType} (v{version})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Contrat</Label>
              <p className="font-medium">{contractNumber ?? "—"}</p>
            </div>
            <div>
              <Label className="text-gray-600">Période</Label>
              <p className="font-medium">
                {formatDateFR(startDate)} — {formatDateFR(endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600">Fréquence</Label>
              <p className="font-medium">{frequency}</p>
            </div>
            <div>
              <Label className="text-gray-600">Type</Label>
              <p className="font-medium">{billingType}</p>
            </div>
            <div>
              <Label className="text-gray-600">Version</Label>
              <p className="font-medium">{version}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Statut</Label>
              <p className="font-medium">{statusLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <Label className="text-gray-600">Créé le</Label>
                <p>{formatDateFR(createdAt)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Modifié le</Label>
                <p>{formatDateFR(updatedAt)}</p>
              </div>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="mt-2">
              <Label className="text-gray-600">Échéances</Label>
              <div className="mt-2 rounded-md border">
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left">
                        <th className="px-3 py-2 w-[80px]">#</th>
                        <th className="px-3 py-2 w-[140px]">Échéance</th>
                        <th className="px-3 py-2 w-[140px]">Montant HT</th>
                        <th className="px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln) => (
                        <tr key={ln.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{ln.sequenceNo}</td>
                          <td className="px-3 py-2">
                            {formatDateFR(ln.dueDate)}
                          </td>
                          <td className="px-3 py-2">
                            {formatMoneyEUR(ln.amountHt)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                              {ln.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ViewBillingScheduleDialog;
