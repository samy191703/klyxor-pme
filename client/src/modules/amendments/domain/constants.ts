import type { AmendmentStatus, AmendmentType } from "./types";

export const AMENDMENTS_QK = {
  root: ["/api/amendments"] as const,
  one: (id: string) => ["/api/amendments", id] as const,
  contracts: ["/api/contracts"] as const,
};

export const AMENDMENT_STATUS_LABELS: Record<AmendmentStatus, string> = {
  draft: "Brouillon",
  pending_signature: "À signer",
  active: "Actif",
  rejected: "Rejeté",
};

export const AMENDMENT_TYPE_LABELS: Record<AmendmentType, string> = {
  price_revision: "Révision prix",
  duration_extension: "Extension durée",
  scope_change: "Changement périmètre",
  indexation_change: "Modification indexation",
};
