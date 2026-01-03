// src/modules/clients/utils/formatters.ts
import {
  CLIENT_TYPE_LABELS,
  CLIENT_STATUS_LABELS,
} from "../domain/constants";

export const formatDateFR = (iso: string | null | undefined) =>
  !iso ? "-" : new Date(iso).toLocaleDateString("fr-FR");

export const formatStatus = (isActive?: boolean | null) =>
  isActive ? CLIENT_STATUS_LABELS.active : CLIENT_STATUS_LABELS.inactive;

export const typeLabel = (t: keyof typeof CLIENT_TYPE_LABELS | string) =>
  (CLIENT_TYPE_LABELS as any)[t] ?? t;

export const formatAddress = (opts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}) => {
  const parts = [
    opts.address?.trim(),
    [opts.postalCode, opts.city].filter(Boolean).join(" "),
    opts.country?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
};
