//client/src/modules/terminations/domain/constants.ts
import { TerminationStatus } from "./types";

//
export const TERMINATIONS_QK = {
  /** Root query key for all terminations */
  root: ["terminations"] as const,

  /** Single termination query key */
  one: (id: string) => [...TERMINATIONS_QK.root, "one", id] as const,

  /** Terminations linked to a specific contract */
  byContract: (contractId: string) =>
    [...TERMINATIONS_QK.root, "byContract", contractId] as const,
  contracts: ["/api/contracts"] as const,
};

export const TERMINATION_STATUS_LABEL: Record<TerminationStatus, string> = {
  draft: "Brouillon",
  pending_validation: "À valider",
  validated: "Validée",
  rejected: "Rejetée",
  executed: "Exécutée",
};

export const TERMINATION_STATUS_COLOR: Record<
  TerminationStatus,
  "default" | "warning" | "success" | "error" | "info"
> = {
  draft: "default",
  pending_validation: "warning",
  validated: "success",
  executed: "info",
  rejected: "error",
};

export const DEFAULT_ROWS_PER_PAGE = 25;

// Libellés harmonisés: "Tout" (et pas "Tous/Toutes")
export const STATUS_OPTIONS: Array<{
  value: "all" | TerminationStatus;
  label: string;
}> = [
  { value: "all", label: "Tout" },
  { value: TerminationStatus.DRAFT, label: "Brouillon" },
  { value: TerminationStatus.PENDING_VALIDATION, label: "À valider" },
  { value: TerminationStatus.VALIDATED, label: "Validée" },
  { value: TerminationStatus.REJECTED, label: "Rejetée" },
  { value: TerminationStatus.EXECUTED, label: "Exécutée" },
];
