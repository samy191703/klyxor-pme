// src/types/indexation.ts
export type IndexStatus = "R" | "P" | "A" | (string & {}); // relaxed

export type IndicesUsed = {
  ICHT?: {
    month: string; // "YYYY-MM"
    value: number;
    status?: IndexStatus;
    updatedAt?: string; // "DD/MM/YYYY"
  };
  // Optionally FMOA, CPI... if your API returns them later
  [series: string]:
    | {
        month: string;
        value: number;
        status?: IndexStatus;
        updatedAt?: string;
      }
    | undefined;
};

export interface CalculationResult {
  status: "FINAL" | "PENDING" | "ERROR" | (string & {});
  indicesUsed?: IndicesUsed;
  rawFactor?: number;
  factor?: number;
  price?: number;
  effectiveFrom?: string; // "YYYY-MM-DD"
}
