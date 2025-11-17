// client/src/modules/invoice/api/invoice.api.ts
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, InvoiceCreateDto, InvoiceUpdateDto } from "../domain/types";
import { INVOICE_QK } from "../domain/constants";

/** ================== KPI ================== **/
export async function fetchInvoiceKpis() {
  const res = await apiRequest("GET", `/api/invoices/kpis/_issam2`);
  return res.json();
}

/** ================== List ================== **/
export type InvoiceQuery = {
  contractNumber?: string;
  invoiceNumber?: string;
  status?: string;
  type?: string;
  generatedBy?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function fetchInvoices(params: InvoiceQuery = {}): Promise<{ rows: Invoice[]; total: number }> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.append(key, value.toString());
  });

  const url = `/api/invoices?${query.toString()}`;
  const res = await apiRequest("GET", url);
  return res.json();
}

/** ================== Get by ID ================== **/
export async function fetchInvoice(id: string): Promise<Invoice> {
  const res = await apiRequest("GET", `/api/invoices/${id}`);
  return res.json();
}

/** ================== Create ================== **/
export async function createInvoice(payload: InvoiceCreateDto): Promise<Invoice> {
  const res = await apiRequest("POST", `/api/invoices`, payload);
  await queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.list(undefined) });
  return res.json();
}

/** ================== Update ================== **/
export async function updateInvoice(
  id: string,
  payload: InvoiceUpdateDto
): Promise<Invoice> {
  const res = await apiRequest("PUT", `/api/invoices/${id}`, payload);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.detail(id) }),
    queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.list(undefined) }),
  ]);

  return res.json();
}


/** ================== Delete ================== **/
export async function deleteInvoice(id: string): Promise<{ message: string }> {
  const res = await apiRequest("DELETE", `/api/invoices/${id}`);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.detail(id) }),
    queryClient.invalidateQueries({ queryKey: INVOICE_QK.invoices.list(undefined) }),
  ]);

  return res.json();
}

/** ================== Download PDF ================== **/
export async function downloadInvoicePdf(id: string, invoiceNumber?: string): Promise<void> {
  try {
    const res = await fetch(`/api/invoices/${id}/pdf`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = "Erreur lors du téléchargement du PDF";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const blob = await res.blob();
    
    // Vérifier que c'est bien un PDF
    if (blob.type !== "application/pdf" && blob.size === 0) {
      throw new Error("Le fichier PDF est vide ou invalide");
    }

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoiceNumber ?? id}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("[downloadInvoicePdf] Error:", error);
    throw error;
  }
}
