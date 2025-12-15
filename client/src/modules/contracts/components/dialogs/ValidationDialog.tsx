import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: any | null;
  decision: "validate" | "reject" | "";
  setDecision: (d: "validate" | "reject" | "") => void;
  rejectionReason: string;
  setRejectionReason: (s: string) => void;
  validationComment: string;
  setValidationComment: (s: string) => void;
  onSubmit: () => void;
};

export default function ValidationDialog({
  open,
  onOpenChange,
  contract,
  decision,
  setDecision,
  rejectionReason,
  setRejectionReason,
  validationComment,
  setValidationComment,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider le contrat</DialogTitle>
        </DialogHeader>

        {contract && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div>N° : {contract.number}</div>
              <div>Titre : {contract.title}</div>
              <div>Type : {contract.type}</div>
              <div>Montant : {contract.amount}</div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Séparation des rôles : le créateur ne peut pas valider son
                propre contrat.
              </AlertDescription>
            </Alert>

            <RadioGroup
              value={decision}
              onValueChange={(v) => setDecision(v as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="validate" id="validate" />
                <Label htmlFor="validate">Valider</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reject" id="reject" />
                <Label htmlFor="reject">Rejeter</Label>
              </div>
            </RadioGroup>

            {decision === "reject" && (
              <div>
                <Label>Motif du rejet</Label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Commentaire (optionnel)</Label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={2}
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!decision || (decision === "reject" && !rejectionReason)}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
