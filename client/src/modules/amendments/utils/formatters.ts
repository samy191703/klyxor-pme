import { AMENDMENT_STATUS_LABELS, AMENDMENT_TYPE_LABELS } from "../domain/constants";

export const formatDateFR = (iso: string | null | undefined) =>
  !iso ? "-" : new Date(iso).toLocaleDateString("fr-FR");

export const formatMoneyEUR = (v?: string | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(parseFloat(v)) : "-";

export const statusLabel = (s: keyof typeof AMENDMENT_STATUS_LABELS | string) =>
  (AMENDMENT_STATUS_LABELS as any)[s] ?? s;

export const typeLabel = (t: keyof typeof AMENDMENT_TYPE_LABELS | string) =>
  (AMENDMENT_TYPE_LABELS as any)[t] ?? t;
