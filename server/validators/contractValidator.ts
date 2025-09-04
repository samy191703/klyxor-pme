/**
 * Validateur de contrats KLYXOR
 * 
 * Ce module assure la validation complète des données contractuelles
 * avec une double protection frontend/backend pour garantir l'intégrité
 * et la sécurité des données.
 * 
 * @module contractValidator
 * @since 2025-01-02
 */

import { z } from 'zod';

/**
 * Schéma de validation principal pour les contrats ENGIE
 * 
 * Validations incluses:
 * - Titre: 3-200 caractères, caractères alphanumériques et ponctuation basique
 * - Type: Types de contrats ENGIE valides uniquement
 * - Business Unit: Unités métier ENGIE officielles
 * - Client: Nom valide avec caractères autorisés
 * - Montant: Positif, maximum 1 milliard €
 * - Dates: Format ISO, cohérence temporelle, plage 2000-2100
 * - Champs conditionnels selon le type de contrat
 */
export const contractValidationSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-\.,'()]+$/, "Le titre contient des caractères non autorisés"),
  
  type: z.enum([
    "electricity", 
    "gas", 
    "renewable_ppa", 
    "maintenance",
    "OMSA",
    "LTSA", 
    "OMGC"
  ], {
    errorMap: () => ({ message: "Type de contrat invalide" })
  }),
  
  businessUnit: z.enum([
    "ENGIE Solutions France",
    "ENGIE Green", 
    "ENGIE Flex",
    "ENGIE Global Energy Management"
  ], {
    errorMap: () => ({ message: "Business Unit invalide" })
  }),
  
  clientName: z.string()
    .min(2, "Le nom du client doit contenir au moins 2 caractères")
    .max(100, "Le nom du client ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s\-'.]+$/, "Le nom du client contient des caractères non autorisés"),
  
  amount: z.number()
    .min(0, "Le montant ne peut pas être négatif")
    .max(1000000000, "Le montant dépasse la limite autorisée")
    .refine(val => !isNaN(val), "Le montant doit être un nombre valide"),
  
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .refine(val => {
      const date = new Date(val);
      return date instanceof Date && !isNaN(date.getTime());
    }, "Date de début invalide")
    .refine(val => {
      const date = new Date(val);
      const minDate = new Date('2000-01-01');
      const maxDate = new Date('2100-12-31');
      return date >= minDate && date <= maxDate;
    }, "La date doit être entre 2000 et 2100"),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .refine(val => {
      const date = new Date(val);
      return date instanceof Date && !isNaN(date.getTime());
    }, "Date de fin invalide")
    .optional(),
  
  billingPeriodicity: z.enum([
    "mensuelle",
    "trimestrielle", 
    "semestrielle",
    "annuelle"
  ]).optional(),
  
  paymentType: z.enum([
    "virement",
    "prelevement",
    "cheque"
  ]).optional(),
  
  indexationFormula: z.enum([
    "none",
    "ICC",
    "ILC", 
    "IRL",
    "BT01",
    "FM0A",
    "custom"
  ]).optional(),
  
  // Champs conditionnels pour certains types
  technology: z.enum(["eolien", "PV"]).optional(),
  maintenanceProvider: z.string().optional(),
  maxAnnualProduction: z.number().min(0).optional(),
  numberOfTurbines: z.number().min(0).optional(),
  pricePerMWh: z.number().min(0).optional()
}).refine(data => {
  // Validation croisée : endDate doit être après startDate
  if (data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  }
  return true;
}, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["endDate"]
}).refine(data => {
  // Validation métier : certains types nécessitent des champs spécifiques
  if (["OMSA", "LTSA", "OMGC"].includes(data.type) && !data.technology) {
    return false;
  }
  return true;
}, {
  message: "La technologie est obligatoire pour ce type de contrat",
  path: ["technology"]
});

/**
 * Valide les données d'un contrat et retourne un résultat structuré
 * 
 * @param data - Données brutes du contrat à valider
 * @returns Objet avec succès/échec et données validées ou erreurs détaillées
 * 
 * @example
 * const result = validateContract(contractData);
 * if (result.success) {
 *   // Utiliser result.data
 * } else {
 *   // Afficher result.errors
 * }
 */
export function validateContract(data: any) {
  try {
    const validated = contractValidationSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return { 
        success: false, 
        errors: formattedErrors,
        message: "Données invalides : " + formattedErrors.map(e => e.message).join(', ')
      };
    }
    return { 
      success: false, 
      message: "Erreur de validation inconnue" 
    };
  }
}

// Schéma de base sans les validations croisées
const contractBaseSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-\.,'()]+$/, "Le titre contient des caractères non autorisés"),
  
  type: z.enum([
    "electricity", 
    "gas", 
    "renewable_ppa", 
    "maintenance",
    "OMSA",
    "LTSA", 
    "OMGC"
  ], {
    errorMap: () => ({ message: "Type de contrat invalide" })
  }),
  
  businessUnit: z.enum([
    "ENGIE Solutions France",
    "ENGIE Green", 
    "ENGIE Flex",
    "ENGIE Global Energy Management"
  ], {
    errorMap: () => ({ message: "Business Unit invalide" })
  }),
  
  clientName: z.string()
    .min(2, "Le nom du client doit contenir au moins 2 caractères")
    .max(100, "Le nom du client ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s\-'.]+$/, "Le nom du client contient des caractères non autorisés"),
  
  amount: z.number()
    .min(0, "Le montant ne peut pas être négatif")
    .max(1000000000, "Le montant dépasse la limite autorisée")
    .refine(val => !isNaN(val), "Le montant doit être un nombre valide"),
  
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .refine(val => {
      const date = new Date(val);
      return date instanceof Date && !isNaN(date.getTime());
    }, "Date de début invalide")
    .refine(val => {
      const date = new Date(val);
      const minDate = new Date('2000-01-01');
      const maxDate = new Date('2100-12-31');
      return date >= minDate && date <= maxDate;
    }, "La date doit être entre 2000 et 2100"),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .refine(val => {
      const date = new Date(val);
      return date instanceof Date && !isNaN(date.getTime());
    }, "Date de fin invalide")
    .optional(),
  
  billingPeriodicity: z.enum([
    "mensuelle",
    "trimestrielle", 
    "semestrielle",
    "annuelle"
  ]).optional(),
  
  paymentType: z.enum([
    "virement",
    "prelevement",
    "cheque"
  ]).optional(),
  
  indexationFormula: z.enum([
    "none",
    "ICC",
    "ILC", 
    "IRL",
    "BT01",
    "FM0A",
    "custom"
  ]).optional(),
  
  // Champs conditionnels pour certains types
  technology: z.enum(["eolien", "PV"]).optional(),
  maintenanceProvider: z.string().optional(),
  maxAnnualProduction: z.number().min(0).optional(),
  numberOfTurbines: z.number().min(0).optional(),
  pricePerMWh: z.number().min(0).optional()
});

// Validation pour la mise à jour (champs optionnels)
export const contractUpdateSchema = contractBaseSchema.partial();

// Validation pour les imports (plus permissive)
export const contractImportSchema = z.object({
  title: z.string().min(1),
  type: z.string(),
  businessUnit: z.string().optional(),
  clientName: z.string(),
  amount: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val
  ),
  startDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ),
  endDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ).optional()
});

// Validation des montants financiers
export const financialAmountSchema = z.number()
  .min(0, "Le montant ne peut pas être négatif")
  .max(999999999.99, "Le montant dépasse la limite")
  .multipleOf(0.01, "Maximum 2 décimales autorisées");

// Validation des pourcentages
export const percentageSchema = z.number()
  .min(0, "Le pourcentage ne peut pas être négatif")
  .max(100, "Le pourcentage ne peut pas dépasser 100%");

// Validation des emails
export const emailSchema = z.string()
  .email("Email invalide")
  .max(255, "Email trop long");

// Validation des numéros de téléphone français
export const phoneSchema = z.string()
  .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, "Numéro de téléphone invalide");

// Export des types TypeScript
export type ContractValidationData = z.infer<typeof contractValidationSchema>;
export type ContractUpdateData = z.infer<typeof contractUpdateSchema>;
export type ContractImportData = z.infer<typeof contractImportSchema>;