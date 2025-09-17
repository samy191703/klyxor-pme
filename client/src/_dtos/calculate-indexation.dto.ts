import { Policy } from "@/_enums/indexation-policy.enum";

export type CalculateIndexationDto = {
  contractCode?: string;
  indexationDate: string;
  policy: Policy;
  requireRevised?: "R" | "P"; // R=Révisées uniquement, P=Provisoires autorisées
  mode: "P0" | "PN1";
  formulaType: "SIMPLE_ICHT" | "MIXED_ICHT_FMOA" | "CPI_PN1";
  base: Partial<{ P0: number; PN1: number; ICHT0: number; FMOA0: number }>;
  weights?: Partial<{ const: number; ICHT: number; FMOA: number }>;
  capPercent?: number | null;
  floorPercent?: number | null;
};
// utils/indexation.ts
export type CalculateDto = {
  contractCode?: string;
  indexationDate: string; // YYYY-MM-DD
  policy: Policy;
  mode: "P0" | "PN1";
  formulaType: "SIMPLE_ICHT" | "MIXED_ICHT_FMOA" | "CPI_PN1";
  base: Partial<{ P0: number; PN1: number; ICHT0: number; FMOA0: number }>;
  weights?: Partial<{ const: number; ICHT: number; FMOA: number }>;
  capPercent?: number | null;
  floorPercent?: number | null;
};
