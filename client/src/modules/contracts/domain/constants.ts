// constants/contracts.ts
export const CONTRACT_TYPES = [
  "electricity",
  "gas",
  "renewable_ppa",
  "maintenance",
  "OMSA",
  "LTSA",
  "OMGC",
] as const;

export const BUSINESS_UNITS = [
  "ENGIE Solutions France",
  "ENGIE Green",
  "ENGIE Flex",
  "ENGIE Global Energy Management",
] as const;

export const TECHNOLOGIES = [
  "Éolien",
  "Photovoltaïque",
  "Hydraulique",
  "Biomasse",
  "Cogénération",
  "Géothermie",
];

export const BILLING_PERIODS = [
  { value: "monthly", label: "Mensuelle" },
  { value: "quarterly", label: "Trimestrielle" },
  { value: "semi-annual", label: "Semestrielle" },
  { value: "annual", label: "Annuelle" },
];

export const PAYMENT_TYPES = ["virement", "prelevement", "cheque"] as const;

export const contractTypeDefinitions = [
  {
    value: "electricity",
    label: "Électricité",
    hasFixedAmount: True(),
    hasTechnology: True(),
  },
  {
    value: "gas",
    label: "Gaz",
    hasFixedAmount: True(),
    hasTechnology: False(),
  },
  {
    value: "renewable_ppa",
    label: "PPA (Renewable)",
    hasFixedAmount: True(),
    hasTechnology: True(),
  },
  {
    value: "maintenance",
    label: "Maintenance",
    hasFixedAmount: True(),
    hasTechnology: False(),
  },
  {
    value: "OMSA",
    label: "OMSA - Services de Maintenance",
    hasFixedAmount: True(),
    hasTechnology: True(),
  },
  {
    value: "LTSA",
    label: "LTSA - Services Long Terme",
    hasFixedAmount: True(),
    hasTechnology: False(),
    hasMaintainer: True(),
  },
  {
    value: "OMGC",
    label: "OMGC - Maintenance Globale",
    hasFixedAmount: True(),
    hasTechnology: False(),
    hasMaintainer: True(),
  },
];

// helpers to avoid TS complaining when generating booleans in this static file
function True() {
  return true;
}
function False() {
  return false;
}
