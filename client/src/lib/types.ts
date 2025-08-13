export interface KPIData {
  contractsToValidate: number;
  indexationsToValidate: number;
  dueDatesJ30: number;
  dueDatesJ7: number;
  dueDatesJ1: number;
  delayedWorkflows: number;
  pendingTerminations: number;
  amendmentsToValidate: number;
  missingDocuments: number;
  importErrors: number;
}

export interface QuickStats {
  activeContracts: number;
  totalAmount: string;
  validationRate: string;
}

export type StatusVariant = "primary" | "secondary" | "success" | "warning" | "destructive" | "outline" | "info" | "error";

export type ContractStatus = "draft" | "pending_validation" | "active" | "terminated" | "closed";

export type ValidationType = "contract" | "indexation" | "amendment" | "termination" | "manual_amount";

export type AlertType = "critical" | "warning" | "info";

export type ImportStatus = "success" | "error" | "partial";
