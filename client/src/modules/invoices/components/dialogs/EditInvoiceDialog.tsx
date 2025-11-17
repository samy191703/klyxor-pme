// src/modules/invoices/components/dialogs/EditInvoiceDialog.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Invoice, InvoiceUpdateDto } from "../../domain/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoice, updateInvoice } from "../../api/invoice.api";
import { INVOICE_QK } from "../../domain/constants";
import { INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "../../domain/constants";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
  refresh?: () => void;
};

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  refresh
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: invoiceId ? INVOICE_QK.invoices.detail(invoiceId) : [],
    queryFn: () => (invoiceId ? fetchInvoice(invoiceId) : null),
    enabled: !!invoiceId && open,
  });

  const [form, setForm] = useState<InvoiceUpdateDto>({
    type: "NORMAL",
    status: "draft",
    description: "",
    dueDate: "",
    baseAmount: 0,
    amount: 0,
    vatRate: 0,
    vatAmount: 0,
    redactionAmount: 0,
    totalAmount: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser le formulaire avec les données de la facture
  useEffect(() => {
    if (invoice) {
      setForm({
        type: invoice.type,
        status: invoice.status,
        description: invoice.description || "",
        dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
        baseAmount: invoice.baseAmount,
        amount: invoice.amount,
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        redactionAmount: invoice.redactionAmount,
        totalAmount: invoice.totalAmount,
      });
    }
  }, [invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !invoice) return;

    try {
      setIsSubmitting(true);

      const payload: InvoiceUpdateDto = {
        type: form.type,
        status: form.status,
        description: form.description || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        baseAmount: Number(form.baseAmount) || 0,
        amount: Number(form.amount) || 0,
        vatRate: Number(form.vatRate) || 0,
        vatAmount: Number(form.vatAmount) || 0,
        redactionAmount: Number(form.redactionAmount) || 0,
        totalAmount: Number(form.totalAmount) || 0,
      };

      await updateInvoice(invoiceId, payload);

      await queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.list() });
      await queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.detail(invoiceId) });

      refresh?.();

      toast({
        title: "Facture modifiée",
        description: "La facture a été modifiée avec succès",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de modifier la facture",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!invoiceId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Modifier la facture
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Modifier la facture
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-12 text-red-600">
            Facture introuvable
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Modifier la facture
          </DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm({ ...form, type: value as any })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">
                    {INVOICE_TYPE_LABELS.NORMAL}
                  </SelectItem>
                  <SelectItem value="ADJUSTEMENT">
                    {INVOICE_TYPE_LABELS.ADJUSTEMENT}
                  </SelectItem>
                  <SelectItem value="AVOIR">
                    {INVOICE_TYPE_LABELS.AVOIR}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as any })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    {INVOICE_STATUS_LABELS.draft}
                  </SelectItem>
                  <SelectItem value="inpaid">
                    {INVOICE_STATUS_LABELS.inpaid}
                  </SelectItem>
                  <SelectItem value="paid">
                    {INVOICE_STATUS_LABELS.paid}
                  </SelectItem>
                  <SelectItem value="paid_parsely">
                    {INVOICE_STATUS_LABELS.paid_parsely}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {INVOICE_STATUS_LABELS.cancelled}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date d'échéance */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Date d'échéance</Label>
            <Input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Montants */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">
              Montants
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseAmount">Montant de base</Label>
                <Input
                  id="baseAmount"
                  type="number"
                  step="0.01"
                  value={form.baseAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      baseAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant HT</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatRate">Taux TVA (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  step="0.01"
                  value={form.vatRate ? form.vatRate * 100 : 0}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0;
                    setForm({
                      ...form,
                      vatRate: rate / 100,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatAmount">Montant TVA</Label>
                <Input
                  id="vatAmount"
                  type="number"
                  step="0.01"
                  value={form.vatAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vatAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redactionAmount">Montant de réduction</Label>
                <Input
                  id="redactionAmount"
                  type="number"
                  step="0.01"
                  value={form.redactionAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      redactionAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Montant TTC</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      totalAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditInvoiceDialog;

