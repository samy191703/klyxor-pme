import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
} from "../domain/constants";

/** 🇫🇷 Format date to French locale (e.g., 15/04/2025) */
export const formatDateFR = (iso: string | null | undefined) =>
  !iso ? "-" : new Date(iso).toLocaleDateString("fr-FR");

/** 💶 Format number as Euro currency */
export const formatMoneyEUR = (v?: string | number | null) =>
  v != null && v !== ""
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(typeof v === "string" ? parseFloat(v) : v)
    : "-";

/** 🏷️ Human-readable label for invoice status */
export const statusLabel = (s: keyof typeof INVOICE_STATUS_LABELS | string) =>
  (INVOICE_STATUS_LABELS as any)[s] ?? s;

/** 🧾 Human-readable label for invoice type */
export const typeLabel = (t: keyof typeof INVOICE_TYPE_LABELS | string) =>
  (INVOICE_TYPE_LABELS as any)[t] ?? t;

/**
 * Converts invoice number to new FAC-YYYY-#### format
 * Handles both old format (INV-XXX-XXX-YYYY-XXXX-XX) and new format (FAC-YYYY-####)
 * @param invoiceNumber - Invoice number in any format
 * @returns Invoice number in FAC-YYYY-#### format
 */
export const formatInvoiceNumber = (invoiceNumber: string | null | undefined): string => {
  if (!invoiceNumber) return "-";
  
  // If already in new format (FAC-YYYY-####), return as-is
  if (/^FAC-\d{4}-\d{4}$/.test(invoiceNumber)) {
    return invoiceNumber;
  }
  
  // Try to convert old format: INV-GAZ–EG–2025–0032-15
  // Extract year and sequence from old format
  const oldFormatMatch = invoiceNumber.match(/INV-[A-Z]+[–-][A-Z]+[–-](\d{4})[–-]\d+[–-](\d+)$/);
  if (oldFormatMatch) {
    const year = oldFormatMatch[1];
    const sequence = oldFormatMatch[2];
    const paddedSequence = String(parseInt(sequence, 10)).padStart(4, "0");
    return `FAC-${year}-${paddedSequence}`;
  }
  
  // If format is not recognized, try to extract year from any format
  const yearMatch = invoiceNumber.match(/(\d{4})/);
  if (yearMatch) {
    const year = yearMatch[1];
    // Extract last numeric sequence if available
    const lastNumberMatch = invoiceNumber.match(/(\d+)(?!.*\d)/);
    if (lastNumberMatch) {
      const sequence = lastNumberMatch[1];
      const paddedSequence = String(parseInt(sequence, 10)).padStart(4, "0");
      return `FAC-${year}-${paddedSequence}`;
    }
    // If no sequence found, use current year's first sequence
    return `FAC-${year}-0001`;
  }
  
  // Fallback: return original if we can't parse it
  return invoiceNumber;
};