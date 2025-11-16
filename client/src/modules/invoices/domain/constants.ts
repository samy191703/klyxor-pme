// src/modules/invoice/domain/constants.ts
import type { InvoiceStatus } from "./types"; // adapte selon ta structure
import type { InvoiceQuery } from "../api/invoice.api";
import { TypeInvoice } from "server/routes/invoice.routes";

/* -----------------------------
   🔗 Query Keys
----------------------------- */
export const INVOICE_QK = {
  invoices: {
    all: ["invoices"] as const,

    list: (filters?: InvoiceQuery) =>
      [...INVOICE_QK.invoices.all, "list", filters] as const,

    detail: (id: string) =>
      [...INVOICE_QK.invoices.all, "detail", id] as const,
  },

  kpis: ["invoices", "kpis"] as const,
};

/* -----------------------------
   🏷️ Label dictionaries
----------------------------- */
export const INVOICE_TYPE_LABELS: Record<TypeInvoice, string> = {
  NORMAL: "Normale",
  ADJUSTEMENT: "Ajustement",
  AVOIR: "Avoir",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  inpaid: "Non payé",
  paid: "Payé",
  cancelled: "Annulée",
  paid_parsely: "Partiellement payé",
};

/* -----------------------------
   📋 Options for selects/filters
----------------------------- */
export const INVOICE_TYPE_OPTIONS = (
  Object.keys(INVOICE_TYPE_LABELS) as TypeInvoice[]
).map((value) => ({
  value,
  label: INVOICE_TYPE_LABELS[value],
}));

export const INVOICE_STATUS_OPTIONS = (
  Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]
).map((value) => ({
  value,
  label: INVOICE_STATUS_LABELS[value],
}));

/* -----------------------------
   ⚙️ Default filters for invoices
----------------------------- */
export const DEFAULT_INVOICE_FILTERS: InvoiceQuery = {
  search: "",
  status: "",
  type: "",
  contractNumber: "",
  invoiceNumber: "",
  generatedBy: "",
  from: "",
  to: "",
  limit: 25,
  offset: 0,
  sortBy: "createdAt",
  sortOrder: "desc",
};
