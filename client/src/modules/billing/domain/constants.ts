// src/modules/billing/domain/constants.ts
import type {
  BillingFrequency,
  BillingType,
  BillingScheduleStatus,
  BillingLineStatus,
} from "./types";

/* -----------------------------
   🔗 Query Keys
----------------------------- */
export const BILLING_QK = {
  schedules: {
    all: ["billing-schedules"] as const,
    list: () => [...BILLING_QK.schedules.all, "list"] as const,
    detail: (id: string) =>
      [...BILLING_QK.schedules.all, "detail", id] as const,
    lines: (scheduleId: string) =>
      [...BILLING_QK.schedules.all, "lines", scheduleId] as const,
  },
  lines: {
    all: ["billing-lines"] as const,
    listBySchedule: (scheduleId: string) =>
      [...BILLING_QK.lines.all, "by-schedule", scheduleId] as const,
    detail: (id: string) => [...BILLING_QK.lines.all, "detail", id] as const,
  },
  // 🔹 Same style as TERMINATIONS_QK.contracts
  contracts: ["/api/contracts"] as const,
};

/* -----------------------------
   🏷️ Label dictionaries
----------------------------- */
export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  A_ECHOIR: "À échoir",
  TERME_ECHU: "Terme échu",
};

export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  ANNUAL: "Annuelle",
  SEMIANNUAL: "Semi-annuelle",
};

export const BILLING_STATUS_LABELS: Record<BillingScheduleStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  archived: "Archivé",
};

export const BILLING_LINE_STATUS_LABELS: Record<BillingLineStatus, string> = {
  A_FACTURER: "À facturer",
  FACTUREE: "Facturée",
};

/* -----------------------------
   📋 Options for selects/filters
----------------------------- */
export const BILLING_TYPE_OPTIONS = (
  Object.keys(BILLING_TYPE_LABELS) as BillingType[]
).map((value) => ({
  value,
  label: BILLING_TYPE_LABELS[value],
}));

export const BILLING_FREQUENCY_OPTIONS = (
  Object.keys(BILLING_FREQUENCY_LABELS) as BillingFrequency[]
).map((value) => ({
  value,
  label: BILLING_FREQUENCY_LABELS[value],
}));

export const BILLING_STATUS_OPTIONS = (
  Object.keys(BILLING_STATUS_LABELS) as BillingScheduleStatus[]
).map((value) => ({
  value,
  label: BILLING_STATUS_LABELS[value],
}));

export const BILLING_LINE_STATUS_OPTIONS = (
  Object.keys(BILLING_LINE_STATUS_LABELS) as BillingLineStatus[]
).map((value) => ({
  value,
  label: BILLING_LINE_STATUS_LABELS[value],
}));
