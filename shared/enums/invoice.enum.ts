// src/modules/invoices/domain/constants.ts
import { InvoiceStatus } from "@/modules/invoices/domain/types";

// ✅ Labels pour le statut des factures
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  inpaid: "Non payé",
  paid: "Payé",
  cancelled: "Annulée",
  paid_parsely: "Partiellement payé",
};

// ✅ Enum et labels pour le type de facture
export enum TypeInvoice {
  NORMAL = "NORMAL",
  ADJUSTEMENT = "ADJUSTEMENT",
  AVOIR = "AVOIR",
}

export const INVOICE_TYPE_LABELS: Record<TypeInvoice, string> = {
  [TypeInvoice.NORMAL]: "Normale",
  [TypeInvoice.ADJUSTEMENT]: "Ajustement",
  [TypeInvoice.AVOIR]: "Avoir",
};

// ✅ Options pour les selects/filters
export const INVOICE_TYPE_OPTIONS = (Object.keys(INVOICE_TYPE_LABELS) as TypeInvoice[]).map(
  (value) => ({ value, label: INVOICE_TYPE_LABELS[value] })
);

export const INVOICE_STATUS_OPTIONS = (Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(
  (value) => ({ value, label: INVOICE_STATUS_LABELS[value] })
);
