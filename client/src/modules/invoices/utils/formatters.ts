import {
  BILLING_STATUS_LABELS,
  BILLING_TYPE_LABELS,
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

/** 🏷️ Human-readable label for billing status */
export const statusLabel = (s: keyof typeof BILLING_STATUS_LABELS | string) =>
  (BILLING_STATUS_LABELS as any)[s] ?? s;

/** 🧾 Human-readable label for billing type */
export const typeLabel = (t: keyof typeof BILLING_TYPE_LABELS | string) =>
  (BILLING_TYPE_LABELS as any)[t] ?? t;
