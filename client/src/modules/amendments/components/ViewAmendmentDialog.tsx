import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Amendment } from "../domain/types";
import { AMENDMENT_TYPE_LABELS, AMENDMENT_STATUS_LABELS } from "../domain/constants";
import { formatDateFR, formatMoneyEUR } from "../utils/formatters";

export function ViewAmendmentDialog({ open, onOpenChange, a }: { open: boolean; onOpenChange: (v: boolean) => void; a?: Amendment | null }) {
  if (!a) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détails de l'avenant</DialogTitle>
          <DialogDescription>{a.number} - {a.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Contrat</Label>
              <p className="font-medium">{a.contractId}</p>
            </div>
            <div>
              <Label className="text-gray-600">Type</Label>
              <p className="font-medium">{AMENDMENT_TYPE_LABELS[a.type]}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Date d'effet</Label>
              <p className="font-medium">{formatDateFR(a.effectiveDate)}</p>
            </div>
            <div>
              <Label className="text-gray-600">Statut</Label>
              <p className="font-medium">{AMENDMENT_STATUS_LABELS[a.status]}</p>
            </div>
          </div>
          {a.description && (
            <div>
              <Label className="text-gray-600">Description</Label>
              <p className="font-medium">{a.description}</p>
            </div>
          )}
          {(a.originalAmount || a.newAmount) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Montant original</Label>
                <p className="font-medium">{formatMoneyEUR(a.originalAmount)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Nouveau montant</Label>
                <p className="font-medium">{formatMoneyEUR(a.newAmount)}</p>
              </div>
            </div>
          )}
          {a.impactDescription && (
            <div>
              <Label className="text-gray-600">Impact</Label>
              <p className="font-medium">{a.impactDescription}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <Label className="text-gray-600">Créé le</Label>
              <p>{formatDateFR(a.createdAt)}</p>
            </div>
            <div>
              <Label className="text-gray-600">Modifié le</Label>
              <p>{formatDateFR(a.updatedAt)}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
