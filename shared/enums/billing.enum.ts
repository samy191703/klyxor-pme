// @shared/enums/billing.enum.ts
export const BillingFrequency = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  ANNUAL: "ANNUAL",
  SEMIANNUAL: "SEMIANNUAL",
} as const;
export type BillingFrequency =
  (typeof BillingFrequency)[keyof typeof BillingFrequency];

export const BillingType = {
  A_ECHOIR: "A_ECHOIR",
  TERME_ECHU: "TERME_ECHU",
} as const;
export type BillingType = (typeof BillingType)[keyof typeof BillingType];

export const BILLING_TYPE_VALUES = [
  BillingType.A_ECHOIR,
  BillingType.TERME_ECHU,
] as const;

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  [BillingType.A_ECHOIR]: "À échoir",
  [BillingType.TERME_ECHU]: "Terme échu",
};

export const BillingScheduleStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;
export type BillingScheduleStatus =
  (typeof BillingScheduleStatus)[keyof typeof BillingScheduleStatus];

export const BillingLineStatus = {
  A_FACTURER: "A_FACTURER",
  FACTUREE: "FACTUREE",
} as const;
export type BillingLineStatus =
  (typeof BillingLineStatus)[keyof typeof BillingLineStatus];

export interface KpiFiltersDto {
  from?: string;  
  to?: string;    
  customer?: string;
}

export interface BillingSchedulesQueryDto {
  contractNumber?: string;
  customer?: string;
  search?: string;
  status?: string;
  type?: string;
  from?: string; 
  to?: string;   
  frequency?: string;

  limit?: number;
  offset?: number;

  sortBy?:
    | "createdAt"
    | "startDate"
    | "endDate"
    | "version"
    | "frequency"
    | "billingType"
    | "contractNumber";

  sortOrder?: "asc" | "desc";
}
