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
    clientName: wd.clientName,
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
