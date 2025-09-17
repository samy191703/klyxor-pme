// ---- Types (lightweight, extend as you wish) ----

export type ID = string | number;

export type ContractCore = {
  id?: ID;
  number?: string;
  title?: string;
  type?: string;
  businessUnit?: string;
  clientName?: string;
  startsOn?: string; // ISO date (server will convert)
  endsOn?: string | null; // ISO date or null
  technology?: string;
  maintenanceProvider?: string;
  currency?: string; // default handled server-side
  amount?: number;
  fixedAmount?: number;
  variableAmount?: number;
  billingPeriodicity?: string;
  paymentType?: string;
  status?: "draft" | "active" | "terminated" | string;
};

export type IndexationBase = {
  P0?: number | null;
  ICHT0?: number;
  FMOA0?: number;
  PN1?: number;
};

export type IndexationConfig = {
  formulaId?: string | null;
  frequency?: string; // "annual", "monthly", etc.
  mode?: "P0" | "PN1";
  policy?: "AT_PUBLICATION_DATE" | "LAST_INDICE_VALUE";
  indexationDate?: string | null; // ISO date (or null)
  requireRevised?: "R" | "P";
  base?: IndexationBase;
  capPercent?: number | null;
  floorPercent?: number | null;
  currency?: string;
};

export type ContractPatch = Partial<
  ContractCore & {
    indexation?: IndexationConfig;
    // server also supports these date fields in PATCH
    indexTakingDate?: string | null;
    lastIndexationDate?: string | null;
    nextIndexationDate?: string | null;
    // extra payload saved server-side
    lastIndexationPreview?: unknown;
  }
>;

export type Contract = ContractCore & {
  id: ID;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ManualModificationPayload = {
  contractId: ID;
  reason?: string;
  changes: Record<string, unknown>;
};
