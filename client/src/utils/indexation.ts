// client/src/utils/indexation.ts
import { CalculateIndexationDto } from "@/_dtos/calculate-indexation.dto";
import { selectBasicAmountAndndices } from "@/utils/select-basis";

/**
 * Déduit le type de formule à partir de la formule sélectionnée
 */
export function inferFormulaType(
  formula: any
): CalculateIndexationDto["formulaType"] {
  const explicit = (
    formula?.formulaType ||
    formula?.typeCode ||
    ""
  ).toUpperCase();

  if (
    explicit === "SIMPLE_ICHT" ||
    explicit === "MIXED_ICHT_FMOA" ||
    explicit === "CPI_PN1"
  ) {
    return explicit as CalculateIndexationDto["formulaType"];
  }

  const hay = `${formula?.name ?? ""} ${
    formula?.expression ?? ""
  }`.toUpperCase();
  if (hay.includes("MIX") || (hay.includes("ICHT") && hay.includes("FMOA")))
    return "MIXED_ICHT_FMOA";
  if (hay.includes("PN1") || hay.includes("CPI")) return "CPI_PN1";
  return "SIMPLE_ICHT";
}

/**
 * Vérifie que les champs 'base' requis sont bien présents selon le type
 */
export function ensureBaseFor(
  type: CalculateIndexationDto["formulaType"],
  dto: CalculateIndexationDto
) {
  const b = dto.base || {};
  // Helper de détection de champ manquant dans base
  const miss = (k: keyof Required<CalculateIndexationDto>["base"]) =>
    (b as any)[k] == null;

  if (type === "SIMPLE_ICHT" && (miss("P0") || miss("ICHT0"))) {
    throw new Error("Base requise: P0 et ICHT0 pour SIMPLE_ICHT.");
  }
  if (
    type === "MIXED_ICHT_FMOA" &&
    (miss("P0") || miss("ICHT0") || miss("FMOA0"))
  ) {
    throw new Error("Base requise: P0, ICHT0 et FMOA0 pour MIXED_ICHT_FMOA.");
  }
  if (type === "CPI_PN1" && miss("PN1")) {
    throw new Error("Base requise: PN1 pour CPI_PN1.");
  }
}

/** Convertit vers nombre ou undefined */
export function toNum(v: any) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? undefined : n;
}

/**
 * Construit le payload pour /api/v1/calculate-from-assets
 * - Conserve le DTO d'origine du moteur
 * - Résout P0/indices de base via selectBasicAmountAndndices pour le cas VARIABLE
 */
export function buildCalculateFromAssetsPayload(
  wd: any,
  formulas: any[]
): CalculateIndexationDto {
  // 1) Trouver la formule sélectionnée
  const selected = formulas.find((f) => f.id === wd.indexationFormula);
  if (!selected) throw new Error("Formule d'indexation introuvable.");

  const formulaType = inferFormulaType(selected);

  // 2) Résoudre P0 + indices de base via la fonction utilitaire (variable OU fixe)
  //    - On passe :
  //      * indexationDate (YYYY-MM-DD ou DD/MM/YYYY)
  //      * baseAmountInput / baseAmountItems / baseAmountFixed (fallbacks)
  //      * baseIndices (objet par série) + fallbacks numériques legacy (ICHT0, FMOA0…)
  const resolved = selectBasicAmountAndndices({
    indexationDate: wd.indexationDate,
    baseAmountInput: wd.baseAmountInput, // { mode, fixed, items } si présent
    baseAmountItems: wd.baseAmountItems, // [{ value, startingFrom }, ...] si présent
    baseAmountFixed:
      toNum(wd.P0) ??
      toNum(wd.indexationBaseAmount) ??
      toNum(wd.amount) ??
      (toNum(wd.fixedAmount) ?? 0) + (toNum(wd.variableAmount) ?? 0), // dernier fallback

    baseIndices: wd.baseIndices, // ex: { ICHT0: {...}, FMOA0: {...} }
    baseIndexFixedFallbacks: {
      ICHT0: toNum(wd.ICHT0),
      FMOA0: toNum(wd.FMOA0),
      // ajoutez ici d'autres séries si vous en avez (ex: CPI0: toNum(wd.CPI0))
    },
  });

  // 3) PN1 reste tel quel (CPI_PN1)
  const pn1 = toNum(wd.PN1);

  // 4) Policy / Mode
  const policy: CalculateIndexationDto["policy"] =
    (wd.indexationPolicy as any) || "AT_INDEXATION_DATE";
  const mode: CalculateIndexationDto["mode"] =
    (wd.indexationMode as any) || (formulaType === "CPI_PN1" ? "PN1" : "P0");

  // 5) Préparer le DTO moteur (forme d'origine)
  const dto: CalculateIndexationDto = {
    contractCode: wd.number || wd.title || undefined,
    indexationDate: wd.indexationDate, // "YYYY-MM-DD"
    policy,
    mode,
    formulaType,
    base: {},
    capPercent: toNum(wd.capPercent) ?? null,
    floorPercent: toNum(wd.floorPercent) ?? null,
    calculationRule: "DerniereValeurIndexation",
  };

  // 6) Remplir base selon le type requis
  if (formulaType === "SIMPLE_ICHT") {
    const P0 = resolved.P0;
    const ICHT0 = resolved.indices?.ICHT0;
    (dto.base as any) = { P0: P0!, ICHT0: ICHT0! };
  } else if (formulaType === "MIXED_ICHT_FMOA") {
    const P0 = resolved.P0;
    const ICHT0 = resolved.indices?.ICHT0;
    const FMOA0 = resolved.indices?.FMOA0;
    (dto.base as any) = { P0: P0!, ICHT0: ICHT0!, FMOA0: FMOA0! };

    // Poids (avec défauts)
    const W = wd.weights || {};
    dto.weights = {
      const: toNum(W.const) ?? 0.15,
      ICHT: toNum(W.ICHT) ?? 0.55,
      FMOA: toNum(W.FMOA) ?? 0.3,
    };
  } else {
    // CPI_PN1
    (dto.base as any) = { PN1: pn1! };
  }

  // 7) Validation minimale
  if (!dto.indexationDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.indexationDate)) {
    throw new Error("indexationDate manquante ou invalide (YYYY-MM-DD).");
  }
  ensureBaseFor(formulaType, dto);

  return dto;
}
