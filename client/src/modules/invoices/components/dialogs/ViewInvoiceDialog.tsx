// src/modules/invoices/components/dialogs/ViewInvoiceDialog.tsx
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
import type { Invoice } from "../../domain/types";
import {
  formatDateFR,
  formatMoneyEUR,
  formatInvoiceNumber,
} from "../../utils/formatters";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  INVOICE_QK,
} from "../../domain/constants";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoice } from "../../api/invoice.api";
import { formatPaymentTerms } from "@/utils/formatters";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
};

export function ViewInvoiceDialog({ open, onOpenChange, invoiceId }: Props) {
  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery<Invoice | null>({
    queryKey: invoiceId ? INVOICE_QK.invoices.detail(invoiceId) : [],
    queryFn: () => (invoiceId ? fetchInvoice(invoiceId) : null),
    enabled: !!invoiceId && open,
  });

  if (!invoiceId) return null;

  // ————— ÉTAT LOADING —————
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="kly-card-soft max-w-md w-full text-kly-text-primary p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-kly-text-primary">
              Détails de la facture
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kly-gold"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ————— ÉTAT ERREUR —————
  if (error || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="kly-card-soft max-w-md w-full text-kly-text-primary p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-kly-text-primary">
              Détails de la facture
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-red-300">
            {error instanceof Error
              ? error.message
              : "Impossible de charger les détails de la facture"}
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

  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type] ?? invoice.type;

  // Petit helper pour un badge de statut KLYXOR
  const renderStatusBadge = (label: string, status: string) => {
    const isBrouillon = status === "draft" || status === "Brouillon";
    const isNonPaye =
      status === "unpaid" ||
      status === "Non payé" ||
      status === "overdue" ||
      status === "En retard";

    if (isBrouillon) {
      return (
        <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium border-slate-300 bg-slate-200/10 text-slate-100">
          {label}
        </span>
      );
    }

    if (isNonPaye) {
      return (
        <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium border-amber-400 bg-amber-500/15 text-amber-300">
          {label}
        </span>
      );
    }

    // Par défaut : statut "Actif / Payé"
    return (
      <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium border-emerald-400 bg-emerald-500/15 text-emerald-300">
        {label}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="kly-card-soft max-w-3xl w-full text-kly-text-primary p-6">
        {/* HEADER */}
        <DialogHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b border-kly-border-soft">
          <div>
            <DialogTitle className="text-lg font-semibold text-kly-text-primary">
              Détails de la facture
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              <span className="text-kly-gold font-semibold">
                {formatInvoiceNumber(invoice.invoiceNumber)}
              </span>
            </DialogDescription>
          </div>
          <div className="text-xs text-kly-text-secondary text-right space-y-1">
            <div>
              <span className="font-semibold text-kly-text-primary">
                Créée le{" "}
              </span>
              {formatDateFR(invoice.createdAt)}
            </div>
            {invoice.updatedAt && (
              <div>
                <span className="font-semibold text-kly-text-primary">
                  Dernière modification :{" "}
                </span>
                {formatDateFR(invoice.updatedAt)}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* CONTENU */}
        <div className="grid gap-6 py-4">
          {/* Informations principales */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                N° Facture
              </Label>
              <p className="mt-1 font-medium text-kly-text-primary">
                {formatInvoiceNumber(invoice.invoiceNumber)}
              </p>
            </div>
            <div>
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                Contrat
              </Label>
              <p className="mt-1 font-medium text-kly-text-primary">
                {invoice.contractNumber ?? invoice.contractId ?? "—"}
              </p>
            </div>
            <div>
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                Condition de paiement
              </Label>
              <p className="mt-1 font-medium text-kly-text-primary">
                {formatPaymentTerms(invoice.paymentTerms as any)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                Type
              </Label>
              <p className="mt-1 font-medium text-kly-text-primary">
                {typeLabel}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                Statut
              </Label>
              {renderStatusBadge(statusLabel, invoice.status)}
            </div>
            <div>
              <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                Date d&apos;échéance
              </Label>
              <p className="mt-1 font-medium text-kly-text-primary">
                {formatDateFR(invoice.dueDate)}
              </p>
            </div>
          </section>

          {/* Montants */}
          <section className="border-t border-kly-border-soft pt-4 mt-2">
            <Label className="text-kly-text-primary font-semibold mb-3 block">
              Montants
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Montant de base
                </Label>
                <p className="mt-1 font-medium text-kly-text-primary">
                  {formatMoneyEUR(invoice.baseAmount)}
                </p>
              </div>
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Montant HT
                </Label>
                <p className="mt-1 font-medium text-kly-text-primary">
                  {formatMoneyEUR(invoice.amount)}
                </p>
              </div>
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Taux TVA
                </Label>
                <p className="mt-1 font-medium text-kly-text-primary">
                  {(() => {
                    const rate = Number(invoice.vatRate) || 0;
                    return rate > 1
                      ? rate.toFixed(2)
                      : (rate * 100).toFixed(2);
                  })()}
                  %
                </p>
              </div>
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Montant TVA
                </Label>
                <p className="mt-1 font-medium text-kly-text-primary">
                  {formatMoneyEUR(invoice.vatAmount)}
                </p>
              </div>
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Montant de réduction
                </Label>
                <p className="mt-1 font-medium text-kly-text-primary">
                  {formatMoneyEUR(invoice.redactionAmount)}
                </p>
              </div>
              <div>
                <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                  Montant TTC
                </Label>
                <p className="mt-1 font-semibold text-lg text-kly-text-primary">
                  {formatMoneyEUR(invoice.totalAmount)}
                </p>
              </div>
            </div>
          </section>

          {/* Description */}
          {invoice.description && (
            <section className="border-t border-kly-border-soft pt-4 mt-2">
              <Label className="text-kly-text-primary font-semibold mb-2 block">
                Description
              </Label>
              <p className="text-sm text-kly-text-primary">
                {invoice.description}
              </p>
            </section>
          )}

          {/* Informations supplémentaires */}
          <section className="border-t border-kly-border-soft pt-4 mt-2">
            <Label className="text-kly-text-primary font-semibold mb-3 block">
              Informations supplémentaires
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {invoice.generatedAt && (
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Date de génération
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {formatDateFR(invoice.generatedAt)}
                  </p>
                </div>
              )}

              {invoice.generatedByUser && (
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Généré par
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {invoice.generatedByUser.name ??
                      invoice.generatedBy ??
                      "—"}
                  </p>
                </div>
              )}

              {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Période de facturation
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {formatDateFR(invoice.billingPeriodStart)} –{" "}
                    {formatDateFR(invoice.billingPeriodEnd)}
                  </p>
                </div>
              )}

              {invoice.billingLineId && (
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Ligne de facturation
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {invoice.billingLineId}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Ligne de facturation associée */}
          {invoice.line && (
            <section className="border-t border-kly-border-soft pt-4 mt-2">
              <Label className="text-kly-text-primary font-semibold mb-3 block">
                Ligne de facturation associée
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Numéro de séquence
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {invoice.line.sequenceNo}
                  </p>
                </div>
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Date d&apos;échéance
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {formatDateFR(invoice.line.dueDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Montant HT
                  </Label>
                  <p className="mt-1 font-medium text-kly-text-primary">
                    {formatMoneyEUR(invoice.line.amountHt)}
                  </p>
                </div>
                <div>
                  <Label className="text-kly-text-secondary text-xs uppercase tracking-wide">
                    Statut
                  </Label>
                  <p className="mt-1">
                    {invoice.line.status === "FACTUREE"
                      ? renderStatusBadge("Facturée", "FACTUREE")
                      : renderStatusBadge("À facturer", "DRAFT")}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-kly-border-soft mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ViewInvoiceDialog;
