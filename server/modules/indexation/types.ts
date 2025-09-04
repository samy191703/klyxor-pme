// Types pour le module d'indexation

export interface IndexationContract {
  id: string;
  contractNumber: string;
  title: string;
  status: 'draft' | 'active' | 'terminated' | 'closed';
  baseAmount: number; // P0
  previousAmount?: number; // Pn-1
  indexationDate: Date;
  frequency: 'annual' | 'quarterly' | 'monthly';
  formulaCode: '2.A' | '2.B' | '3' | string;
  indices: {
    ICHT0?: number;
    ICHT0_date?: Date;
    FM0A0?: number;
    FM0A0_date?: Date;
    CPI0?: number;
    CPI0_date?: Date;
  };
  cap?: number; // Plafond de variation en %
  threshold?: number; // Seuil minimum en %
  rounding?: 'none' | 'decimal' | 'banking' | 'unit';
  currency: 'EUR' | 'USD' | string;
}

export interface IndexValue {
  key: 'ICHT' | 'CPI' | 'FM0A' | string;
  period: string; // YYYY-MM
  value: number;
  source: 'INSEE' | 'EUROSTAT' | 'MANUAL' | string;
  publishedAt: Date;
  definitive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IndexationProposal {
  id: string;
  contractId: string;
  period: string;
  formulaCode: string;
  baseAmount: number;
  previousAmount?: number;
  indices: {
    ICHT0?: number;
    FM0A0?: number;
    CPI0?: number;
    ICHT_rev?: number;
    FM0A_rev?: number;
    CPI_rev?: number;
  };
  cap?: number;
  threshold?: number;
  rounding?: string;
  calculatedAmount: number;
  newAmount: number;
  deltaAbsolute: number;
  deltaPercent: number;
  status: 'draft' | 'awaiting_validation' | 'validated' | 'rejected' | 'applied';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt?: Date;
  validatedAt?: Date;
  validatedBy?: string;
  appliedAt?: Date;
  traceId: string;
}

export interface IndexationReport {
  id: string;
  proposalId: string;
  contractId: string;
  period: string;
  pdfUri?: string;
  xlsUri?: string;
  checksum: string;
  generatedAt: Date;
  content: {
    contract: string;
    formula: string;
    indices: Array<{
      name: string;
      originalValue: number;
      originalDate: string;
      revisedValue: number;
      revisedDate: string;
      source: string;
    }>;
    previousAmount: number;
    newAmount: number;
    variation: number;
    variationPercent: number;
    decision: string;
    decisionBy: string;
    decisionDate: Date;
  };
}

export interface FormulaParameters {
  formulaCode: string;
  baseAmount: number;
  indices: Record<string, number>;
  cap?: number;
  threshold?: number;
  rounding?: string;
}

export interface CalculationResult {
  calculatedAmount: number;
  finalAmount: number;
  deltaAbsolute: number;
  deltaPercent: number;
  cappedApplied: boolean;
  thresholdApplied: boolean;
  roundingApplied: boolean;
  details: {
    rawCalculation: number;
    afterThreshold: number;
    afterCap: number;
    afterRounding: number;
  };
}

export interface IndexationEvent {
  type: 'INDEXATION_PROPOSED' | 'INDEXATION_VALIDATED' | 'INDEXATION_REJECTED' | 'INDEXATION_APPLIED';
  contractId: string;
  proposalId: string;
  timestamp: Date;
  payload: any;
  traceId: string;
}