import { CalculateIndexationDto } from "@/_dtos/calculate-indexation.dto";

function toNum(v: any) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? undefined : n;
}

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

export function ensureBaseFor(
  type: CalculateIndexationDto["formulaType"],
  dto: CalculateIndexationDto
) {
  const b = dto.base || {};
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

export function buildCalculateFromAssetsPayload(
  wd: any,
  formulas: any[]
): CalculateIndexationDto {
  const selected = formulas.find((f: any) => f.id === wd.indexationFormula);
  if (!selected) throw new Error("Formule d'indexation introuvable.");
  const formulaType = inferFormulaType(selected);

  const p0 =
    toNum(wd.P0) ??
    toNum(wd.indexationBaseAmount) ??
    toNum(wd.amount) ??
    (toNum(wd.fixedAmount) ?? 0) + (toNum(wd.variableAmount) ?? 0);
  const pn1 = toNum(wd.PN1);
  const ICHT0 = toNum(wd.ICHT0);
  const FMOA0 = toNum(wd.FMOA0);

  const policy: CalculateIndexationDto["policy"] =
    (wd.indexationPolicy as any) || "AT_INDEXATION_DATE";
  const mode: CalculateIndexationDto["mode"] =
    (wd.indexationMode as any) || (formulaType === "CPI_PN1" ? "PN1" : "P0");

  const dto: CalculateIndexationDto = {
    contractCode: wd.number || wd.title || undefined,
    indexationDate: wd.indexationDate,
    policy,
    mode,
    formulaType,
    base: {},
    capPercent: toNum(wd.capPercent) ?? null,
    floorPercent: toNum(wd.floorPercent) ?? null,
  };

  if (formulaType === "SIMPLE_ICHT") {
    dto.base = { P0: p0!, ICHT0: ICHT0! };
  } else if (formulaType === "MIXED_ICHT_FMOA") {
    dto.base = { P0: p0!, ICHT0: ICHT0!, FMOA0: FMOA0! };
    const W = wd.weights || {};
    dto.weights = {
      const: toNum(W.const) ?? 0.15,
      ICHT: toNum(W.ICHT) ?? 0.55,
      FMOA: toNum(W.FMOA) ?? 0.3,
    };
  } else {
    dto.base = { PN1: pn1! };
  }

  if (
    !dto.indexationDate ||
    !/^\\d{4}-\\d{2}-\\d{2}$/.test(dto.indexationDate)
  ) {
    throw new Error("indexationDate manquante ou invalide (YYYY-MM-DD).");
  }
  ensureBaseFor(formulaType, dto);
  return dto;
}
