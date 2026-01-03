export type ValidationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "redirected";

export interface SimpleUser {
  id: string;
  name: string;
  email: string | null;
}

export interface ValidationRequest {
  id: string;
  type: string;
  referenceId: string;
  reference: string;
  subject: string;
  age: number; // en jours
  requestedBy: string | null;
  assignedTo: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  status: ValidationStatus;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;

  // 🔗 enrichi par jointures (comme Terminations)
  requestedByUser?: SimpleUser | null;
  assignedToUser?: SimpleUser | null;
  validatedByUser?: SimpleUser | null;
}
export const VALIDATION_STATUS_LABEL: Record<ValidationStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  redirected: "Redirigé",
};
