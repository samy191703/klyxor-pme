export const VALIDATION_REQUESTS_QK = {
  root: ["validation-requests"] as const,
  list: ["validation-requests", "list"] as const,
  contracts: ["validation-requests", "contracts"] as const, // if you reuse contracts fetching
} as const;
export const VALIDATION_STATUS = [
  "pending",
  "approved",
  "rejected",
  "redirected",
] as const;

export const VALIDATION_STATUS_LABEL: Record<
  (typeof VALIDATION_STATUS)[number],
  string
> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  redirected: "Redirigée",
};

// ⬇️ Options MUI <MenuItem/> à la manière de Terminations
export const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: VALIDATION_STATUS_LABEL.pending },
  { value: "approved", label: VALIDATION_STATUS_LABEL.approved },
  { value: "rejected", label: VALIDATION_STATUS_LABEL.rejected },
  { value: "redirected", label: VALIDATION_STATUS_LABEL.redirected },
] as const;
