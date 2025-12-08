export type BillingLineStatus = 'DRAFT' | 'A_FACTURER' | 'FACTUREE' | 'ANNULEE';

export interface BillingLine {
  id: string;
  scheduleId: string;
  dueDate: string; // ISO 8601
  billingStartDate: string; // ISO 8601 - Date de début de la période facturée
  billingEndDate: string; // ISO 8601 - Date de fin de la période facturée
  invoiceDate?: string | null; // ISO 8601 - Date de génération de la facture
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
