// src/utils/select-basic.ts
export type DatedValue = {
  value: number;
  /** "YYYY-MM-DD" or "DD/MM/YYYY" (inclusive from this date) */
  startingFrom: string;
};

export type VariableOrFixed =
  | number // fixed shorthand (e.g., 128.72)
  | DatedValue[] // variable shorthand (array)
  | {
      mode: "FIXED" | "VARIABLE";
      fixed?: number | null;
      items?: DatedValue[];
    }; // explicit structure (if you already store it this way)

/** Normalize "01/01/2010" or "2010-01-01" -> "2010-01-01". Returns null if invalid. */
function toISODate(input?: string | null): string | null {
  if (!input) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // DD/MM/YYYY
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m = input.match(ddmmyyyy);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback try Date()
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

/** Sort ascending by startingFrom (ISO); dedupe by date (last wins) */
function normalizeDated(values: DatedValue[] = []): DatedValue[] {
  const map = new Map<string, number>();
  for (const it of values) {
    const iso = toISODate(it?.startingFrom);
    if (!iso || typeof it?.value !== "number") continue;
    map.set(iso, it.value);
  }
  return [...map.entries()]
    .map(([startingFrom, value]) => ({ startingFrom, value }))
    .sort((a, b) =>
      a.startingFrom < b.startingFrom
        ? -1
        : a.startingFrom > b.startingFrom
        ? 1
        : 0
    );
}

/** Pick last item with date <= onDateISO; returns undefined if none match */
function pickEffective(
  values: DatedValue[] = [],
  onDateISO?: string | null
): number | undefined {
  if (!values.length || !onDateISO) return undefined;
  const list = normalizeDated(values);
  let eff: number | undefined = undefined;
  for (const it of list) {
    if (it.startingFrom <= onDateISO) eff = it.value;
    else break;
  }
  return eff;
}

/** Resolve a single field that can be fixed or variable (supports 3 shapes) */
function resolveField(
  input: VariableOrFixed | undefined,
  onDateISO: string | null
): number | undefined {
  if (input == null) return undefined;

  // 1) number → fixed
  if (typeof input === "number") return input;

  // 2) array → variable
  if (Array.isArray(input)) return pickEffective(input, onDateISO);

  // 3) explicit mode
  if (typeof input === "object" && input.mode) {
    if (input.mode === "FIXED") {
      return input.fixed != null ? Number(input.fixed) : undefined;
    }
    return pickEffective(input.items || [], onDateISO);
  }

  return undefined;
}

export type SelectBasicParams = {
  /** The calculation date (indexationDate). Accepts "YYYY-MM-DD" or "DD/MM/YYYY". */
  indexationDate: string;

  /** Base amount (P0) sources (any one or several; variable wins if present) */
  baseAmountFixed?: number | null;
  baseAmountItems?: DatedValue[]; // variable shorthand
  baseAmountInput?: VariableOrFixed; // explicit structure

  /** Base indices map. Key examples: ICHT0, FMOA0, CPI0... */
  baseIndices?:
    | Record<string, VariableOrFixed> // flexible per-index definition
    | undefined;

  /** Optional simple numeric fallbacks (e.g., legacy fields): { ICHT0: 128.72, FMOA0: 102.3 } */
  baseIndexFixedFallbacks?: Record<string, number | null | undefined>;
};

export type SelectBasicResult = {
  /** P0 if resolved */
  P0?: number;
  /** e.g., { ICHT0: 128.72, FMOA0: 103.4 } — only keys that resolved */
  indices: Record<string, number>;
};

/**
 * Resolve the effective Base Amount (P0) and base indices at a given indexation date.
 * Rule: pick the last {startingFrom, value} with startingFrom <= indexationDate.
 * If nothing matches, returns undefined for that field (caller decides the fallback/validation).
 */
export function selectBasicAmountAndndices(
  params: SelectBasicParams
): SelectBasicResult {
  const onDateISO = toISODate(params.indexationDate);
  const indicesOut: Record<string, number> = {};

  // --- Resolve P0 ---
  let P0: number | undefined;

  // Priority: explicit object → items array → fixed scalar
  P0 =
    resolveField(params.baseAmountInput, onDateISO) ??
    (params.baseAmountItems
      ? resolveField(params.baseAmountItems, onDateISO)
      : undefined) ??
    (params.baseAmountFixed != null
      ? Number(params.baseAmountFixed)
      : undefined);

  // --- Resolve indices ---
  if (params.baseIndices && typeof params.baseIndices === "object") {
    for (const [k, v] of Object.entries(params.baseIndices)) {
      const resolved = resolveField(v, onDateISO);
      if (typeof resolved === "number" && !Number.isNaN(resolved)) {
        indicesOut[k] = resolved;
      }
    }
  }

  // Legacy numeric fallbacks for any missing index key
  if (params.baseIndexFixedFallbacks) {
    for (const [k, v] of Object.entries(params.baseIndexFixedFallbacks)) {
      if (indicesOut[k] == null && v != null) {
        const n = Number(v);
        if (!Number.isNaN(n)) indicesOut[k] = n;
      }
    }
  }

  return { P0, indices: indicesOut };
}
