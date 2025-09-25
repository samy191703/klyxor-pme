import {
  CONTRACT_TYPE_VALUES,
  BUSINESS_UNIT_VALUES,
  LANGUAGE_VALUES,
  TECHNOLOGY_VALUES,
  Languages,
  BILLING_PERIOD_VALUES,
  PAYMENT_TYPE_VALUES,
} from "@shared/enums/contracts";
import { z } from "zod";

const TITLE_RX = /^[A-Za-zÀ-ÿ0-9\s\-.,'()_/]+$/;
const CLIENT_NAME_RX = /^[A-Za-zÀ-ÿ\s\-'.]+$/;
/** STEP 1 — only general info */
export const contractStep1Schema = z
  .object({
    /*  number: z
      .string()
      .min(2, "Le numéro doit contenir au moins 2 caractères")
      .max(100, "Le numéro ne peut pas dépasser 100 caractères"), */
    // .regex(CONTRACT_NUMBER_RX, "Numéro de contrat invalide"),
    title: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caractères")
      .max(200, "Le titre ne peut pas dépasser 200 caractères")
      .regex(TITLE_RX, "Le titre contient des caractères non autorisés"),
    clientName: z
      .string()
      .min(2, "Le nom du client doit contenir au moins 2 caractères")
      .max(100, "Le nom du client ne peut pas dépasser 100 caractères")
      .regex(
        CLIENT_NAME_RX,
        "Le nom du client contient des caractères non autorisés"
      ),
    type: z.enum(CONTRACT_TYPE_VALUES, {
      errorMap: () => ({ message: "Type de contrat invalide" }),
    }),
    businessUnit: z.enum(BUSINESS_UNIT_VALUES, {
      errorMap: () => ({ message: "Business Unit invalide" }),
    }),
    currency: z.enum(["EUR", "USD"]).default("EUR"),
    language: z.enum(LANGUAGE_VALUES).default(Languages.FR),
    technology: z.enum(TECHNOLOGY_VALUES).optional(),
    maintainer: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Si type exige une techno (ex: OMSA/LTSA/OMGC via tes defs)
    if (["OMSA", "LTSA", "OMGC"].includes(data.type) && !data.technology) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["technology"],
        message: "La technologie est obligatoire pour ce type de contrat",
      });
    }
  });

/** STEP 2 — période & montants (NOUVEAU) */
// Enums Zod avec messages personnalisés
const BILLING_ENUM = z.enum(BILLING_PERIOD_VALUES, {
  errorMap: () => ({ message: "Périodicité de facturation invalide" }),
});
const PAYMENT_ENUM = z.enum(PAYMENT_TYPE_VALUES, {
  errorMap: () => ({ message: "Type de paiement invalide" }),
});

export const contractStep2Schema = z
  .object({
    startDate: z
      .string({
        required_error: "La date de début est obligatoire",
        invalid_type_error: "La date de début est invalide",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),

    endDate: z
      .string({
        required_error: "La date de fin est obligatoire",
        invalid_type_error: "La date de fin est invalide",
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),

    fixedAmount: z.coerce
      .number({
        required_error: "Le montant fixe est obligatoire",
        invalid_type_error: "Le montant fixe doit être un nombre",
      })
      .min(0, "Le montant fixe ne peut pas être négatif"),

    variableAmount: z.coerce
      .number({
        invalid_type_error: "Le montant variable doit être un nombre",
      })
      .min(0, "Le montant variable ne peut pas être négatif")
      .default(0),

    billingPeriod: BILLING_ENUM, // "monthly" | "quarterly" | "semi-annual" | "annual"
    billingFrequency: BILLING_ENUM.optional(), // compat éventuelle
    paymentType: PAYMENT_ENUM, // "virement" | "prelevement" | "cheque"
    currency: z
      .enum(["EUR", "USD"], {
        errorMap: () => ({ message: "Devise invalide" }),
      })
      .optional(),

    // Énergie: on les laisse optionnels dans le schéma (contrainte faite dans la route via type DB)
    maxAnnualProduction: z.coerce
      .number({
        invalid_type_error: "La production annuelle max doit être un nombre",
      })
      .min(0, "La production annuelle max ne peut pas être négative")
      .optional(),
    numberOfTurbines: z.coerce
      .number({
        invalid_type_error: "Le nombre d’éoliennes doit être un entier",
      })
      .min(0, "Le nombre d’éoliennes ne peut pas être négatif")
      .optional(),
    pricePerMWh: z.coerce
      .number({ invalid_type_error: "Le prix par MWh doit être un nombre" })
      .min(0, "Le prix par MWh ne peut pas être négatif")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const s = new Date(data.startDate);
    const e = new Date(data.endDate);
    if (!(e > s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La date de fin doit être postérieure à la date de début",
      });
    }
  });

const FREQ_ENUM = z.enum(["monthly", "quarterly", "semi-annual", "annual"]);
const MODE_ENUM = z.enum(["P0", "PN1"]);
const POLICY_ENUM = z.enum(["AT_PUBLICATION_DATE", "LAST_INDICE_VALUE"]);
const REVISED_ENUM = z.enum(["R", "P"]).default("R");
const CURRENCY_ENUM = z.enum(["EUR", "USD"]);

const numCoerce = z.preprocess((v) => {
  if (typeof v === "number") return v;
  if (v == null || v === "") return undefined;
  return parseFloat(String(v).replace(",", "."));
}, z.number().finite());

const VarFixed = z.object({
  mode: z.literal("FIXED"),
  fixed: numCoerce.nullish(),
});

const VarVariable = z.object({
  mode: z.literal("VARIABLE"),
  items: z
    .array(
      z.object({
        startingFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        value: numCoerce,
      })
    )
    .min(1),
});

const VariableNumberInput = z.union([VarFixed, VarVariable]);

// === CalculationResult payload sent back from the UI ===
const IndexStatusEnum = z.union([
  z.literal("R"),
  z.literal("P"),
  z.literal("A"),
  z.string(),
]);
const IndicesUsedEntry = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  value: numCoerce,
  status: IndexStatusEnum.optional(),
  updatedAt: z.string().optional(), // "DD/MM/YYYY"
});

const CalculationResultSchema = z.object({
  status: z.string().min(1), // "FINAL" | "PENDING" | "ERROR" | ...
  indicesUsed: z.record(z.string(), IndicesUsedEntry.optional()).optional(),
  rawFactor: numCoerce.optional(),
  factor: numCoerce.optional(),
  price: numCoerce.optional(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// Small helper to accept "" as undefined
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);

export const contractStep3Schema = z
  .object({
    // NEW switch
    indexationEnabled: z.boolean().default(false),

    // NEW: real formula id chosen in the select
    indexationFormulaId: emptyToUndef(z.string().min(1)).optional().nullable(),

    // Store the formula *type* string (optional but nice to have)
    indexationFormula: emptyToUndef(z.string().min(1)).optional().nullable(),

    // Core step 3 fields (kept with defaults, but validated only if enabled)
    indexationFrequency: FREQ_ENUM.default("annual"),
    indexationMode: MODE_ENUM.default("P0"), // "P0" | "PN1"
    indexationPolicy: POLICY_ENUM.default("AT_PUBLICATION_DATE"),

    indexationDate: emptyToUndef(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    ).optional(),
    lastIndiceDate: emptyToUndef(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    ).optional(),

    requireRevised: REVISED_ENUM.optional(), // "R" | "P"

    // Base amount (series)
    baseAmountInput: VariableNumberInput.optional(), // validated if enabled

    // Base indices
    baseIndices: z
      .object({
        ICHT0: VariableNumberInput.optional(),
        FMOA0: VariableNumberInput.optional(),
      })
      .partial()
      .optional(),

    // PN1 (only if mode = PN1)
    PN1: emptyToUndef(numCoerce).optional(),

    capPercent: z
      .preprocess((v) => (v === "" || v == null ? null : v), numCoerce)
      .nullable()
      .optional(),
    floorPercent: z
      .preprocess((v) => (v === "" || v == null ? null : v), numCoerce)
      .nullable()
      .optional(),

    currency: CURRENCY_ENUM.default("EUR"),

    // Optional cache from preview
    baseIndiceValues: z.record(z.string(), numCoerce).optional(),
    lastIndexationPreview: CalculationResultSchema.optional(),
  })
  .superRefine((d, ctx) => {
    // If indexation is disabled, nothing else is required.
    if (!d.indexationEnabled) return;

    // When enabled, enforce the minimal set:
    if (!d.indexationFormulaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexationFormulaId"],
        message: "Sélectionnez une formule d'indexation",
      });
    }

    if (!d.indexationFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexationFrequency"],
        message: "Fréquence d'indexation requise",
      });
    }

    if (!d.indexationMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexationMode"],
        message: "Mode d'indexation requis",
      });
    }

    if (!d.indexationPolicy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexationPolicy"],
        message: "Règle de prise d'indice requise",
      });
    }

    if (!d.indexationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["indexationDate"],
        message: "Date d’indexation requise",
      });
    }

    // If policy = LAST_INDICE_VALUE, lastIndiceDate is required
    if (d.indexationPolicy === "LAST_INDICE_VALUE" && !d.lastIndiceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastIndiceDate"],
        message: "Date de prise d'indice requise",
      });
    }

    // If mode = PN1, PN1 numeric value is required and > 0
    if (d.indexationMode === "PN1" && (!d.PN1 || Number(d.PN1) <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PN1"],
        message: "PN1 requis pour le mode PN1",
      });
    }

    // Ensure base reference is provided: either a P0 series or PN1 (the latter already checked above)
    if (d.indexationMode !== "PN1") {
      if (!d.baseAmountInput) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseAmountInput"],
          message: "Base P0 requise (montant fixe ou série)",
        });
      }
    }
  });

/** FULL (si tu en as besoin à la fin) */
export const contractFullSchema = contractStep1Schema
  .and(contractStep2Schema)
  .and(contractStep3Schema);

type Step = "step1" | "step2" | "step3" | "full";

const SCHEMAS: Record<Step, z.ZodTypeAny> = {
  step1: contractStep1Schema,
  step2: contractStep2Schema,
  step3: contractStep3Schema,
  full: contractFullSchema,
};

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFail = {
  success: false;
  message: string;
  errors: Array<{ field: string; message: string }>;
};

/**
 * Validate contract data for a given step.
 * @param data The payload to validate (partial for step1/2/3, full for "full").
 * @param step Which step schema to use ("step1" | "step2" | "step3" | "full")
 * @param mergeBase Optional: previously saved contract (used only when step === "full")
 *                  If provided, we merge `data` over `mergeBase` and validate the result.
 */
export function validateContract<T extends Step = "full">(
  data: unknown,
  step: T,
  mergeBase?: unknown
): ValidationSuccess<any> | ValidationFail {
  try {
    const schema = SCHEMAS[step];

    // If you want to validate the final object from an incremental update:
    const toValidate =
      step === "full" && mergeBase
        ? { ...(mergeBase as any), ...(data as any) }
        : data;

    const validated = schema.parse(toValidate);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return {
        success: false,
        errors: formattedErrors,
        message:
          "Données invalides : " +
          formattedErrors.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      message: "Erreur de validation inconnue",
      errors: [{ field: "_", message: "Erreur de validation inconnue" }],
    };
  }
}
