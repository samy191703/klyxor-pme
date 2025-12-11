const PAYMENT_TYPES = ["virement", "prelevement", "cheque"] as const;
const BILLING_PERIODICITY_MAP: Record<string, any> = {
  monthly: "mensuelle",
  quarterly: "trimestrielle",
  "semi-annual": "semestrielle",
  annual: "annuelle",
} as any;

const TECHNOLOGY_MAP: Record<string, "eolien" | "PV"> = {
  Éolien: "eolien",
  Eolien: "eolien",
  Photovoltaïque: "PV",
  Photovoltaique: "PV",
};

const CONTRACT_TYPES = [
  "electricity",
  "gas",
  "renewable_ppa",
  "maintenance",
  "OMSA",
  "LTSA",
  "OMGC",
] as const;

function toNum(v: any) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function sanitizeClientName(name: string | undefined | null): string {
  if (!name || !name.trim()) return "";
  
  // Remove characters that are not allowed by the regex: /^[A-Za-zÀ-ÿ\s\-'.]+$/
  // Keep only: letters (including accented), spaces, hyphens, dots, apostrophes
  const sanitized = name
    .replace(/[^a-zA-ZÀ-ÿ\s\-'.]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
  
  // If sanitization resulted in a valid name (at least 2 characters with allowed chars), return it
  if (sanitized.length >= 2 && /^[A-Za-zÀ-ÿ\s\-'.]+$/.test(sanitized)) {
    return sanitized;
  }
  
  // If the original name is valid, return it trimmed
  const trimmed = name.trim();
  if (trimmed.length >= 2 && /^[A-Za-zÀ-ÿ\s\-'.]+$/.test(trimmed)) {
    return trimmed;
  }
  
  // If invalid (e.g., only numbers), return the original name
  // The backend validation will catch this and show a proper error message
  // This prevents empty clientName which could cause 500 errors
  return trimmed || name;
}

export function buildContractPayload(wd: any) {
  const fixed = toNum(wd.fixedAmount) ?? 0;
  const variable = toNum(wd.variableAmount) ?? 0;
  const amount = fixed + variable;
  const businessUnit = wd.businessUnit ?? wd.bu;
  const type = wd.type;

  const rawTech = wd.technology;
  const technology =
    rawTech && TECHNOLOGY_MAP[rawTech] ? TECHNOLOGY_MAP[rawTech] : undefined;

  const billingPeriodicity =
    wd.billingPeriodicity ??
    (wd.billingPeriod && BILLING_PERIODICITY_MAP[wd.billingPeriod]);
  const paymentType = (PAYMENT_TYPES as readonly string[]).includes(
    wd.paymentType
  )
    ? wd.paymentType
    : undefined;

  const startDate = wd.startDate;
  const endDate = wd.endDate || undefined;

  const maxAnnualProduction = toNum(wd.maxAnnualProduction);
  const numberOfTurbines = toNum(wd.numberOfTurbines);
  const pricePerMWh = toNum(wd.pricePerMWh);

  return {
    title: wd.title,
    type,
    businessUnit,
    clientName: sanitizeClientName(wd.clientName),
    amount,
    startDate,
    endDate,
    billingPeriodicity,
    paymentType,
    technology,
    maintenanceProvider: wd.maintainer || wd.maintenanceProvider || undefined,
    maxAnnualProduction,
    numberOfTurbines,
    pricePerMWh,
  };
}
