// src/modules/invoices/components/dialogs/ViewInvoiceDialog.tsx
import { useState } from "react";
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
import { formatDateFR, formatMoneyEUR } from "../../utils/formatters";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
} from "../../domain/constants";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoice } from "../../api/invoice.api";
import { INVOICE_QK } from "../../domain/constants";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
};

export function ViewInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
}: Props) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: invoiceId ? INVOICE_QK.invoices.detail(invoiceId) : [],
    queryFn: () => (invoiceId ? fetchInvoice(invoiceId) : null),
    enabled: !!invoiceId && open,
  });

  if (!invoiceId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Détails de la facture
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Détails de la facture
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-12 text-red-600">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold">
              Détails de la facture
            </DialogTitle>
            <DialogDescription className="font-bold text-sm text-gray-700">
              {invoice.invoiceNumber}
            </DialogDescription>
          </div>
          <div className="text-sm text-gray-500">
            Créé le {formatDateFR(invoice.createdAt)}
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Informations principales */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600 text-sm">N° Facture</Label>
              <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <Label className="text-gray-600 text-sm">Contrat</Label>
              <p className="font-medium text-gray-900">
                {invoice.contractNumber ?? invoice.contractId ?? "—"}
              </p>
            </div>
            <div>
              <Label className="text-gray-600 text-sm">Client</Label>
              <p className="font-medium text-gray-900">
                {invoice.clientName ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600 text-sm">Type</Label>
              <p className="font-medium text-gray-900">{typeLabel}</p>
            </div>
            <div className="flex flex-col justify-start items-start gap-2">
              <Label className="text-gray-600 text-sm">Statut</Label>
              <p className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {statusLabel}
              </p>
            </div>
            <div>
              <Label className="text-gray-600 text-sm">Date d'échéance</Label>
              <p className="font-medium text-gray-900">
                {formatDateFR(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Montants */}
          <div className="border-t pt-4 mt-2">
            <Label className="text-gray-700 font-semibold mb-3 block">
              Montants
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600 text-sm">Montant de base</Label>
                <p className="font-medium text-gray-900">
                  {formatMoneyEUR(invoice.baseAmount)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-sm">Montant HT</Label>
                <p className="font-medium text-gray-900">
                  {formatMoneyEUR(invoice.amount)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-sm">Taux TVA</Label>
                <p className="font-medium text-gray-900">
                  {(invoice.vatRate * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-sm">Montant TVA</Label>
                <p className="font-medium text-gray-900">
                  {formatMoneyEUR(invoice.vatAmount)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-sm">Montant de réduction</Label>
                <p className="font-medium text-gray-900">
                  {formatMoneyEUR(invoice.redactionAmount)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">
                  Montant TTC
                </Label>
                <p className="font-semibold text-lg text-gray-900">
                  {formatMoneyEUR(invoice.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {invoice.description && (
            <div className="border-t pt-4 mt-2">
              <Label className="text-gray-700 font-semibold mb-2 block">
                Description
              </Label>
              <p className="text-gray-900">{invoice.description}</p>
            </div>
          )}

          {/* Informations supplémentaires */}
          <div className="border-t pt-4 mt-2">
            <Label className="text-gray-700 font-semibold mb-3 block">
              Informations supplémentaires
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {invoice.generatedAt && (
                <div>
                  <Label className="text-gray-600 text-sm">Date de génération</Label>
                  <p className="font-medium text-gray-900">
                    {formatDateFR(invoice.generatedAt)}
                  </p>
                </div>
              )}
              {invoice.generatedByUser && (
                <div>
                  <Label className="text-gray-600 text-sm">Généré par</Label>
                  <p className="font-medium text-gray-900">
                    {invoice.generatedByUser.name ?? invoice.generatedBy ?? "—"}
                  </p>
                </div>
              )}
              {invoice.updatedAt && (
                <div>
                  <Label className="text-gray-600 text-sm">Dernière modification</Label>
                  <p className="font-medium text-gray-900">
                    {formatDateFR(invoice.updatedAt)}
                  </p>
                </div>
              )}
              {invoice.billingLineId && (
                <div>
                  <Label className="text-gray-600 text-sm">Ligne de facturation</Label>
                  <p className="font-medium text-gray-900">
                    {invoice.billingLineId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informations sur la ligne de facturation si disponible */}
          {invoice.line && (
            <div className="border-t pt-4 mt-2">
              <Label className="text-gray-700 font-semibold mb-3 block">
                Ligne de facturation associée
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Numéro de séquence</Label>
                  <p className="font-medium text-gray-900">
                    {invoice.line.sequenceNo}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Date d'échéance</Label>
                  <p className="font-medium text-gray-900">
                    {formatDateFR(invoice.line.dueDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Montant HT</Label>
                  <p className="font-medium text-gray-900">
                    {formatMoneyEUR(invoice.line.amountHt)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Statut</Label>
                  <p className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {invoice.line.status === "FACTUREE" ? "Facturée" : "À facturer"}
                  </p>
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

export default ViewInvoiceDialog;

