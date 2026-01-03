// src/shared/enums/contracts.ts
import { pgEnum } from "drizzle-orm/pg-core";

/**
 * ================================
 * Enums & PG Enums
 * ================================
 */

/** Types de contrat */
export enum ContractTypes {
  ELECTRICITY = "electricity",
  GAS = "gas",
  RENEWABLE_PPA = "renewable_ppa",
  MAINTENANCE = "maintenance",
  OMSA = "OMSA",
  LTSA = "LTSA",
  OMGC = "OMGC",
}
export const CONTRACT_TYPE_VALUES = Object.values(ContractTypes) as [
  ContractTypes,
  ...ContractTypes[]
];

export const CONTRACT_TYPE_LABELS: Record<ContractTypes, string> = {
  [ContractTypes.ELECTRICITY]: "Électricité",
  [ContractTypes.GAS]: "Gaz",
  [ContractTypes.RENEWABLE_PPA]: "PPA (Renewable)",
  [ContractTypes.MAINTENANCE]: "Maintenance",
  [ContractTypes.OMSA]: "OMSA - Services de Maintenance",
  [ContractTypes.LTSA]: "LTSA - Services Long Terme",
  [ContractTypes.OMGC]: "OMGC - Maintenance Globale",
};
export const contractTypeEnum = pgEnum("contract_type", CONTRACT_TYPE_VALUES);

/** Langues disponibles */
export enum Languages {
  FR = "FR",
  EN = "EN",
}
export const LANGUAGE_VALUES = Object.values(Languages) as [
  Languages,
  ...Languages[]
];
export const languageEnum = pgEnum("language", LANGUAGE_VALUES);

/** Business Units ENGIE */
export enum BusinessUnits {
  SOLUTIONS_FRANCE = "ENGIE Solutions France",
  GREEN = "ENGIE Green",
  FLEX = "ENGIE Flex",
  GLOBAL_ENERGY = "ENGIE Global Energy Management",
}
export const BUSINESS_UNIT_VALUES = Object.values(BusinessUnits) as [
  BusinessUnits,
  ...BusinessUnits[]
];
export const BUSINESS_UNIT_LABELS: Record<BusinessUnits, string> = {
  [BusinessUnits.SOLUTIONS_FRANCE]: "ENGIE Solutions France",
  [BusinessUnits.GREEN]: "ENGIE Green",
  [BusinessUnits.FLEX]: "ENGIE Flex",
  [BusinessUnits.GLOBAL_ENERGY]: "ENGIE Global Energy Management",
};
export const businessUnitEnum = pgEnum("business_unit", BUSINESS_UNIT_VALUES);

/** Technologies énergétiques */
export enum Technologies {
  EOLIEN = "Éolien",
  PHOTOVOLTAIQUE = "Photovoltaïque",
  HYDRAULIQUE = "Hydraulique",
  BIOMASSE = "Biomasse",
  COGENERATION = "Cogénération",
  GEOTHERMIE = "Géothermie",
}
export const TECHNOLOGY_VALUES = Object.values(Technologies) as [
  Technologies,
  ...Technologies[]
];
export const TECHNOLOGY_LABELS: Record<Technologies, string> = {
  [Technologies.EOLIEN]: "Éolien",
  [Technologies.PHOTOVOLTAIQUE]: "Photovoltaïque",
  [Technologies.HYDRAULIQUE]: "Hydraulique",
  [Technologies.BIOMASSE]: "Biomasse",
  [Technologies.COGENERATION]: "Cogénération",
  [Technologies.GEOTHERMIE]: "Géothermie",
};
//export const technologyEnum = pgEnum("technology", TECHNOLOGY_VALUES);

// ===============================
// Billing periods
// ===============================

export enum BillingPeriods {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  SEMIANNUAL = "semi-annual",
  ANNUAL = "annual",
}

export const BILLING_PERIOD_VALUES = [
  BillingPeriods.MONTHLY,
  BillingPeriods.QUARTERLY,
  BillingPeriods.SEMIANNUAL,
  BillingPeriods.ANNUAL,
] as const;

export const BILLING_PERIOD_LABELS: Record<BillingPeriods, string> = {
  [BillingPeriods.MONTHLY]: "Mensuelle",
  [BillingPeriods.QUARTERLY]: "Trimestrielle",
  [BillingPeriods.SEMIANNUAL]: "Semestrielle",
  [BillingPeriods.ANNUAL]: "Annuelle",
};

export const BILLING_PERIODS = [
  { value: BillingPeriods.MONTHLY, label: "Mensuelle" },
  { value: BillingPeriods.QUARTERLY, label: "Trimestrielle" },
  { value: BillingPeriods.SEMIANNUAL, label: "Semestrielle" },
  { value: BillingPeriods.ANNUAL, label: "Annuelle" },
];

// ================================
// TVA Rates
// ===============================
export enum tvaRates {
  RATE_20 = 0.2,
  RATE_14 = 0.14,
  RATE_10 = 0.1,
  RATE_7 = 0.07,
}

export const TVA_RATE_VALUES = [
  { value: tvaRates.RATE_20, label: "20%" },
  { value: tvaRates.RATE_14, label: "14%" },
  { value: tvaRates.RATE_10, label: "10%" },
  { value: tvaRates.RATE_7, label: "7%" },
];

// ===============================
// Payment types
// ===============================

export enum PaymentTypes {
  VIREMENT = "virement",
  PRELEVEMENT = "prelevement",
  CHEQUE = "cheque",
}

export const PAYMENT_TYPE_VALUES = [
  PaymentTypes.VIREMENT,
  PaymentTypes.PRELEVEMENT,
  PaymentTypes.CHEQUE,
] as const;

export const PAYMENT_TYPE_LABELS: Record<PaymentTypes, string> = {
  [PaymentTypes.VIREMENT]: "Virement",
  [PaymentTypes.PRELEVEMENT]: "Prélèvement",
  [PaymentTypes.CHEQUE]: "Chèque",
};

//export const paymentTypeEnum = pgEnum("payment_type", PAYMENT_TYPE_VALUES);

/**
 * ================================
 * Définitions pour le Wizard
 * ================================
 */
export const contractTypeDefinitions: Array<{
  value: ContractTypes;
  label: string;
  hasFixedAmount: boolean;
  hasTechnology?: boolean;
  hasMaintainer?: boolean;
}> = [
  {
    value: ContractTypes.ELECTRICITY,
    label: "Électricité",
    hasFixedAmount: true,
    hasTechnology: true,
  },
  {
    value: ContractTypes.GAS,
    label: "Gaz",
    hasFixedAmount: true,
    hasTechnology: false,
  },
  {
    value: ContractTypes.RENEWABLE_PPA,
    label: "PPA (Renewable)",
    hasFixedAmount: true,
    hasTechnology: true,
  },
  {
    value: ContractTypes.MAINTENANCE,
    label: "Maintenance",
    hasFixedAmount: true,
    hasTechnology: false,
  },
  {
    value: ContractTypes.OMSA,
    label: "OMSA - Services de Maintenance",
    hasFixedAmount: true,
    hasTechnology: true,
  },
  {
    value: ContractTypes.LTSA,
    label: "LTSA - Services Long Terme",
    hasFixedAmount: true,
    hasTechnology: false,
    hasMaintainer: true,
  },
  {
    value: ContractTypes.OMGC,
    label: "OMGC - Maintenance Globale",
    hasFixedAmount: true,
    hasTechnology: false,
    hasMaintainer: true,
  },
];

