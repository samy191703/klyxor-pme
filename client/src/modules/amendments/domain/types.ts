import { User } from "@shared/schema";

export interface Amendment {
  id: string;
  contractId: string;
  contractNumber?: string; // populated when joining
  number: string;
  type: AmendmentType;
  title?: string;
  description?: string | null;
  status: AmendmentStatus;
  effectiveDate?: string; // ISO date
  originalAmount?: number;
  newAmount?: number;
  impactDescription?: string | null;
  requestedBy: string;
  requestedByUser?: User;
  approvedByUser?: User;
  approvedBy?: string | null;
  signedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AmendmentCreateDto = {
  contractId: string;
  //number: string;
  type: AmendmentType;
  title: string;
  description?: string;
  status?: AmendmentStatus; // default draft server-side
  effectiveDate?: string; // yyyy-mm-dd
  originalAmount?: number;
  newAmount?: number;
  impactDescription?: string;
};

export type AmendmentUpdateDto = Partial<
  Pick<
    Amendment,
    | "type"
    | "title"
    | "description"
    | "status"
    | "effectiveDate"
    | "originalAmount"
    | "newAmount"
    | "impactDescription"
  >
>;

export interface ContractRef {
  id: string;
  number: string;
  title: string;
}

export type AmendmentStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "rejected";

export type AmendmentType =
  | "price_revision"
  | "duration_extension"
  | "scope_change"
  | "indexation_change";
