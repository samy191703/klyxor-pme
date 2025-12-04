export type BillingLineStatus = 'A_FACTURER' | 'FACTUREE';

export interface BillingLine {
  id: string;
  scheduleId: string;
  dueDate: string; // ISO 8601
  amountHt: string; // decimal as string
  status: BillingLineStatus;
  invoiceReference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSchedule {
  id: string;
  contractId: string;
  startDate: string;
  endDate: string;
  frequency: string;
  billingType: string;
  version: number;
  status: string;
  billingLines?: BillingLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingScheduleResponse {
  schedule: BillingSchedule;
  meta: {
    totalLines: number;
    responseTime: string;
  };
}
