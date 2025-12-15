// src/modules/invoices/components/GenerateInvoiceModal.tsx
import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createInvoice } from "../api/invoice.api";
import type { BillingLine } from "@/modules/billing/domain/types";
import {
  FileText,
  Calendar,
  Euro,
  Loader2,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  contractId: string;
  billingLineId: string;
  line: BillingLine;
  onSuccess?: () => void;
};

export function GenerateInvoiceModal({
  open,
  onClose,
  contractId,
  billingLineId,
  line,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pré-remplir les valeurs par défaut
  useEffect(() => {
    if (line && open) {
      setDescription("");
      // Format date for input (YYYY-MM-DD)
      if (line.dueDate) {
        const date = new Date(line.dueDate);
        const formattedDate = date.toISOString().split("T")[0];
        setDueDate(formattedDate);
      } else {
        // Default to tomorrow if no due date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDueDate(tomorrow.toISOString().split("T")[0]);
      }
    }
  }, [line, open]);

  const handleGenerateInvoice = async () => {
    if (!dueDate) {
      toast({
        title: "Erreur",
        description: "La date d'échéance est requise",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createInvoice({
        contractId,
        billingLineId,
        description: description || undefined,
        dueDate: new Date(dueDate).toISOString(),
      });

      toast({
        title: "Facture générée",
        description: "La facture a été générée avec succès",
      });

      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error("Error generating invoice:", err);
      toast({
        title: "Erreur",
        description:
          err?.message || "Erreur lors de la génération de la facture",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!line) return null;

  const formattedAmount = line.amountHt
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(Number(line.amountHt))
    : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Générer une facture
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Créez une nouvelle facture pour cette ligne de facturation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Informations de la ligne - Style carte KPI */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F2A43]">
                      #{line.sequenceNo}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Séquence
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {line.amountHt && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Euro className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#0F2A43]">
                        {formattedAmount.split(",")[0]}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Montant HT
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
                <span className="text-xs font-normal text-gray-400 ml-1">
                  (optionnel)
                </span>
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez les services ou produits facturés..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Date d'échéance */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
                Date d'échéance
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                La date d'échéance doit être dans le futur
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerateInvoice}
            disabled={isSubmitting || !dueDate}
            className="bg-[#0F2A43] hover:bg-[#0F2A43]/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              "Générer la facture"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateInvoiceModal;
