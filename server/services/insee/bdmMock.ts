// server/services/insee/bdmMock.ts

// Définition de données “mock” pour les séries d’index INSEE BDM
export type IndexPoint = { period: string; value: number };

// Valeurs “placeholder” (à remplacer plus tard si besoin).
// Objectif: démo + moteur d’indexation actif, sans dépendre d’INSEE.
const MOCK: Record<string, IndexPoint[]> = {
  IRL: [
    { period: "2025-10", value: 144.12 },
    { period: "2025-11", value: 144.48 },
    { period: "2025-12", value: 144.77 },
  ],
  ILC: [
    { period: "2025-10", value: 132.20 },
    { period: "2025-11", value: 132.55 },
    { period: "2025-12", value: 132.90 },
  ],
  ICC: [
    { period: "2025-10", value: 2100.5 },
    { period: "2025-11", value: 2106.2 },
    { period: "2025-12", value: 2111.7 },
  ],
  BT: [
    { period: "2025-10", value: 129.1 },
    { period: "2025-11", value: 129.6 },
    { period: "2025-12", value: 130.0 },
  ],
};

export function getMockSeries(code: string): IndexPoint[] {
  return MOCK[code] ?? [];
}

export function getMockLatest(code: string): IndexPoint | null {
  const s = getMockSeries(code);
  return s.length ? s[s.length - 1] : null;
}
