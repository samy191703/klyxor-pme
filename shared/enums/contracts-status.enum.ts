// shared/enums/contract-status.enum.ts

export const ContractStatus = {
  DRAFT: "draft",
  PENDING_VALIDATION: "pending_validation",
  ACTIVE: "active",
  TERMINATED: "terminated",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

// ---------- Labels (FR/EN can be extended) ----------
export const ContractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: "Brouillon",
  [ContractStatus.PENDING_VALIDATION]: "En attente de validation",
  [ContractStatus.ACTIVE]: "Actif",
  [ContractStatus.TERMINATED]: "Résilié",
  [ContractStatus.CLOSED]: "Clôturé",
  [ContractStatus.ARCHIVED]: "Archivé",
};

/** 🔹 Export a readonly tuple of values for Zod enum usage */
export const CONTRACT_STATUS_VALUES = [
  ContractStatus.DRAFT,
  ContractStatus.PENDING_VALIDATION,
  ContractStatus.ACTIVE,
  ContractStatus.TERMINATED,
  ContractStatus.CLOSED,
  ContractStatus.ARCHIVED,
] as const;
