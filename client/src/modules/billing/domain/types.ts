// src/modules/billing/domain/types.ts

/** =========================
 *  ENUMS (string unions)
 *  ========================= */
export type BillingFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"
  | "SEMIANNUAL";
export type BillingType = "A_ECHOIR" | "TERME_ECHU";
export type BillingScheduleStatus = "draft" | "active" | "archived";

export type BillingLineStatus = "A_FACTURER" | "FACTUREE";

/** =========================
 *  BILLING SCHEDULE
 *  ========================= */
export interface BillingSchedule {
  id: string;

  contractId: string;
  /** Optionnel – côté API tu peux “join” pour l’affichage */
  contractNumber?: string | null;

  startDate: string; // ISO timestamp
  endDate: string; // ISO timestamp

  frequency: BillingFrequency;
  billingType: BillingType;

  version: number;
  status: BillingScheduleStatus;

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** DTOs (frontend -> backend) */
export interface BillingScheduleCreateDto {
  contractId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  frequency: BillingFrequency;
  billingType: BillingType;
  version: number;
  status?: BillingScheduleStatus; // défaut "draft" côté DB
}

/** DTOs (frontend -> backend) */
export interface BillingScheduleGenerateDto {
  id: string;
}

export interface BillingScheduleUpdateDto {
  startDate?: string;
  endDate?: string;
  frequency?: BillingFrequency;
  billingType?: BillingType;
  version?: number;
  status?: BillingScheduleStatus;
}

/** =========================
 *  BILLING LINE
 *  ========================= */
export interface BillingLine {
  id: string;
  scheduleId: string;

  sequenceNo: number; // 1..N
  dueDate: string; // ISO timestamp

  /** Attention: si l’API renvoie un DECIMAL en string, tu peux typer string | number
   *  et normaliser à l’entrée. Ici on reste en number pour coller aux autres modules. */
  amountHt: number;

  status: BillingLineStatus;

  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** DTOs Lines */
export interface BillingLineCreateDto {
  scheduleId: string;
  sequenceNo: number;
  dueDate: string;
  amountHt: number;
  status?: BillingLineStatus; // défaut "A_FACTURER"
}

export interface BillingLineUpdateDto {
  sequenceNo?: number;
  dueDate?: string;
  amountHt?: number;
  status?: BillingLineStatus;
}

export type BillingScheduleWithLines = BillingSchedule & {
  lines: BillingLine[];
};
