import { User } from "@shared/schema";

export enum TerminationStatus {
  DRAFT = "draft",
  PENDING_VALIDATION = "pending_validation",
  VALIDATED = "validated",
  REJECTED = "rejected",
  EXECUTED = "executed",
}

export interface Termination {
  id: string;
  contractId: string;
  number: string;
  reason: string;
  type: string;
  status: TerminationStatus;
  description?: string | null;
  compensationAmount?: string; // keep string to mirror backend (decimal as text)
  effectiveDate: string; // ISO
  noticeDate?: string | null;
  assignedValidator?: string | null;
  requestedBy?: string | null;
  requestedByUser?: User | null;
  validatedBy?: string | null;
  validatedByUser?: User | null;

  validatedAt?: string | null;
  executedBy?: string | null;
  executedByUser?: User | null;
  executedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TerminationCreateDto {
  contractId: string;
  number?: string;
  reason: string;
  type: string;
  effectiveDate: string; // ISO
  noticeDate?: string | null;
  compensationAmount?: string;
  description?: string | null;
  submit?: boolean; // if true -> pending_validation else draft
}

export interface TerminationUpdateDto {
  reason: string;
  type: string;
  description?: string | null;
  compensationAmount?: string;
  effectiveDate: string; // ISO
  noticeDate?: string | null;
}

export interface TerminationPatchDto {
  reason?: string;
  type?: string;
  description?: string | null;
  compensationAmount?: string;
  effectiveDate?: string | null; // allow null to clear
  noticeDate?: string | null; // allow null to clear
  rejectionReason?: string | null;
}

export type SetStatusPayload = {
  status: TerminationStatus;
  reason?: string; // (audit trail)
};

export type DecisionPayload =
  | { decision: "validate" }
  | { decision: "reject"; rejectionReason: string };

export interface ContractRef {
  id: string;
  number: string;
  title: string;
}
