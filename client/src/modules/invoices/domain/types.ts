// src/modules/invoices/domain/types.ts

/** =========================
 *  ENUMS (string unions)
 *  ========================= */
export type InvoiceType = "NORMAL" | "ADJUSTEMENT" | "AVOIR";
export type InvoiceStatus = "draft" | "inpaid" | "paid" | "cancelled" | "paid_parsely";

/** =========================
 *  INVOICE
 *  ========================= */

export enum InvoiceAction {
    Validate = "validate",
    RevertToDraft = "revertToDraft",
}

export interface Invoice {
  paymentTerms: string;
  id: string;
  invoiceNumber: string;

  contractId: string;
  billingLineId?: string | null;

  type: InvoiceType;
  status: InvoiceStatus;

  description?: string | null;

  baseAmount: number;
  amount: number;
  vatRate: number;
  vatAmount: number;
  redactionAmount: number;
  totalAmount: number;

  dueDate: string; // ISO timestamp
  generatedAt?: string; // ISO timestamp
  generatedBy?: string; // userId

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  /** enrichissements frontend / joins */
  contractNumber?: string | null;
  clientName?: string | null;
  line?: BillingLine | null;
  generatedByUser?: User | null;
}

export enum PaymentTermsEnum {
  "30J" = "30j", 
  "60J" = "60j",
  "A_COMMANDE" = "a_commande",
  "A_LIVRAISON" = "a_livraison",
  "50_50" = "50/50",
}

/** =========================
 *  INVOICE CREATE / UPDATE DTOs
 *  ========================= */
export interface InvoiceCreateDto {
  contractId: string;
  billingLineId: string;
  dueDate: string;
  paymentTerms?:PaymentTermsEnum | null;
  description?: string;
}

export interface InvoiceUpdateDto {
  type?: InvoiceType;
  contractId?: string;
  billingLineId?: string;
  description?: string;
  paymentTerms?:PaymentTermsEnum | null;
  baseAmount?: number;
  amount?: number;
  vatRate?: number;
  vatAmount?: number;
  redactionAmount?: number;
  totalAmount?: number;
  status?: InvoiceStatus;
  dueDate?: string;
  generatedAt?: string;
  generatedBy?: string;
  invoiceAction?: "validate" | "revertToDraft";
}

/** =========================
 *  USER (pour enrichissement)
 *  ========================= */
export interface User {
  id: string;
  name: string;
  email?: string;
}

/** =========================
 *  BILLING LINE (pour enrichissement)
 *  ========================= */
export interface BillingLine {
  id: string;
  scheduleId: string;
  sequenceNo: number;
  dueDate: string;
  amountHt: number;
  status: "A_FACTURER" | "FACTUREE";
  createdAt: string;
  updatedAt: string;
}

/** =========================
 *  FILTRES pour requêtes frontend
 *  ========================= */
export interface InvoiceFiltersQuery {
  search?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
  generatedBy?: string;
  contractNumber?: string;
  invoiceNumber?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
