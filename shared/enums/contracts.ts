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
export const contractTypeEnum = pgEnum("contract_type", CONTRACT_TYPE_VALUES);

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
export const technologyEnum = pgEnum("technology", TECHNOLOGY_VALUES);

/** Périodes de facturation */
export enum BillingPeriods {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  SEMI_ANNUAL = "semi-annual",
  ANNUAL = "annual",
}
export const BILLING_PERIODS = [
  { value: BillingPeriods.MONTHLY, label: "Mensuelle" },
  { value: BillingPeriods.QUARTERLY, label: "Trimestrielle" },
  { value: BillingPeriods.SEMI_ANNUAL, label: "Semestrielle" },
  { value: BillingPeriods.ANNUAL, label: "Annuelle" },
];

/** Modes de paiement */
export enum PaymentTypes {
  VIREMENT = "virement",
  PRELEVEMENT = "prelevement",
  CHEQUE = "cheque",
}
export const PAYMENT_TYPE_VALUES = Object.values(PaymentTypes) as [
  PaymentTypes,
  ...PaymentTypes[]
];
export const paymentTypeEnum = pgEnum("payment_type", PAYMENT_TYPE_VALUES);

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
