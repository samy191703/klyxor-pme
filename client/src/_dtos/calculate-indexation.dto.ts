export type CalculateIndexationDto = {
  contractCode?: string;
  indexationDate: string;
  policy: "AT_INDEXATION_DATE" | "AT_N_MINUS_1" | "AT_REVISED_PUBLICATION";
  mode: "P0" | "PN1";
  formulaType: "SIMPLE_ICHT" | "MIXED_ICHT_FMOA" | "CPI_PN1";
  base: Partial<{ P0: number; PN1: number; ICHT0: number; FMOA0: number }>;
  weights?: Partial<{ const: number; ICHT: number; FMOA: number }>;
  capPercent?: number | null;
  floorPercent?: number | null;
  calculationRule?: "DerniereValeurIndexation" | "DerniereValeurMiseAJour";
};
// utils/indexation.ts
export type CalculateDto = {
  contractCode?: string;
  indexationDate: string; // YYYY-MM-DD
  policy: "AT_INDEXATION_DATE" | "AT_N_MINUS_1" | "AT_REVISED_PUBLICATION";
  mode: "P0" | "PN1";
  formulaType: "SIMPLE_ICHT" | "MIXED_ICHT_FMOA" | "CPI_PN1";
  base: Partial<{ P0: number; PN1: number; ICHT0: number; FMOA0: number }>;
  weights?: Partial<{ const: number; ICHT: number; FMOA: number }>;
  capPercent?: number | null;
  floorPercent?: number | null;
};
