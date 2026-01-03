/**
 * Service de récupération des indices économiques INSEE (import TS)
 * - Source: server/data/economic_indices.ts (export ECONOMIC_INDICES_RAW)
 * - Séries: CPI, ICHT, FMOA
 * - base = "INSEE", source = "INSEE"
 * - status?: "R" | "P"
 */

import { storage } from "./storage";
import { ECONOMIC_INDICES_RAW } from "./data/economic_indices";

/** Séries configurées (codes & seriesId conformes) */
export const INSEE_SERIES = {
  CPI: {
    id: "001763852",
    name: "Indice des prix à la consommation",
    code: "CPI",
    url: "https://www.insee.fr/fr/statistiques/serie/001763852",
    frequency: "monthly" as const,
  },
  ICHT: {
    id: "001565183",
    name: "Indice du coût horaire du travail",
    code: "ICHT",
    url: "https://www.insee.fr/fr/statistiques/serie/001565183",
    frequency: "monthly" as const,
  },
  FMOA: {
    id: "010764313",
    name: "Indice FMOA",
    code: "FMOA",
    url: "https://www.insee.fr/fr/statistiques/serie/010764313",
    frequency: "monthly" as const,
  },
} as const;

type SeriesConfig = (typeof INSEE_SERIES)[keyof typeof INSEE_SERIES];

/** Type final utilisé par l’app */
export interface EconomicIndex {
  seriesId: string;
  code: "CPI" | "ICHT" | "FMOA";
  name: string;
  date: Date; // 1er du mois (UTC)
  value: string; // décimal en string
  year: number;
  month: number; // 1..12
  base: "INSEE";
  source: "INSEE";
  status?: "R" | "P";
}

/** Type brut importé depuis le fichier TS */
export type EconomicIndexRaw = {
  seriesId: string;
  code: string;
  name: string;
  date: string; // "YYYY-MM-01T00:00:00.000Z"
  value: string; // "118.88"
  year: number;
  month: number; // 1..12
  base: string; // sera forcé à "INSEE"
  source: string; // sera forcé à "INSEE"
  status?: "R" | "P";
};

/** Normalisation → EconomicIndex */
function normalize(raw: EconomicIndexRaw): EconomicIndex {
  const d = new Date(raw.date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;

  return {
    seriesId: raw.seriesId,
    code: raw.code as EconomicIndex["code"],
    name: raw.name,
    date: new Date(Date.UTC(year, month - 1, 1)),
    value: String(raw.value),
    year,
    month,
    base: "INSEE",
    source: "INSEE",
    status: raw.status,
  };
}

/** Données importées (const) et triées desc par date */
const ECONOMIC_INDICES: EconomicIndex[] = ECONOMIC_INDICES_RAW
  // on garde seulement les codes attendus
  .filter((r) => r && ["CPI", "ICHT", "FMOA"].includes(r.code))
  .map(normalize)
  .sort((a, b) => b.date.getTime() - a.date.getTime());

/** Récupère les données d'une série INSEE */
export async function fetchINSEESeries(
  series: SeriesConfig
): Promise<EconomicIndex[]> {
  return ECONOMIC_INDICES.filter(
    (i) => i.code === series.code && i.seriesId === series.id
  );
}

/** Récupère toutes les séries configurées (CPI, ICHT, FMOA) */
export async function fetchAllINSEEIndices(): Promise<EconomicIndex[]> {
  const seriesIds = new Set(Object.values(INSEE_SERIES).map((s) => s.id));
  const codes = new Set(Object.values(INSEE_SERIES).map((s) => s.code));
  return ECONOMIC_INDICES.filter(
    (i) => seriesIds.has(i.seriesId as any) && codes.has(i.code)
  );
}

/** Upsert en base (si utilisé côté webapp) */
export async function updateIndicesInDatabase(
  indices: EconomicIndex[]
): Promise<void> {
  for (const index of indices) {
    await storage.upsertEconomicIndex(index);
  }
  console.log(`${indices.length} indices mis à jour en base de données`);
}

/** Dernière valeur ≤ targetDate (via storage) */
export async function getLatestIndexValue(
  code: string,
  targetDate: Date
): Promise<number | null> {
  const index = await storage.getLatestEconomicIndex(code, targetDate);
  return index ? parseFloat(index.value) : null;
}

/** Variation (%) entre deux dates (via storage) */
export async function calculateIndexVariation(
  code: string,
  dateFrom: Date,
  dateTo: Date
): Promise<number | null> {
  const indexFrom = await getLatestIndexValue(code, dateFrom);
  const indexTo = await getLatestIndexValue(code, dateTo);
  if (indexFrom == null || indexTo == null) return null;
  return ((indexTo - indexFrom) / indexFrom) * 100;
}

/** Synchronisation: import TS → upsert DB */
export async function synchronizeINSEEIndices(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  try {
    console.log("Début de la synchronisation INSEE (import TS)...");
    const indices = await fetchAllINSEEIndices();

    if (indices.length === 0) {
      return { success: false, message: "Aucun indice trouvé", count: 0 };
    }

    await updateIndicesInDatabase(indices);

    return {
      success: true,
      message: `Synchronisation réussie (${indices.length} indices)`,
      count: indices.length,
    };
  } catch (error) {
    console.error("Erreur lors de la synchronisation INSEE:", error);
    return {
      success: false,
      message: `Erreur: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
      count: 0,
    };
  }
}
