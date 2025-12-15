import { z } from "zod";

export type ClientType = "PRO" | "PARTICULIER";

// Schéma de base commun aux deux types de clients
export const baseClientSchema = z.object({
  type_client: z.enum(["PRO", "PARTICULIER"]),
  email: z.string().email(),
  telephone: z.string().optional().nullable(),
  adresse_ligne1: z.string().optional().nullable(),
  adresse_ligne2: z.string().optional().nullable(),
  code_postal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
});

// Client professionnel
export const proClientSchema = baseClientSchema.extend({
  type_client: z.literal("PRO"),
  raison_sociale: z.string().min(1, "La raison sociale est obligatoire"),

  // SIRET optionnel, mais s'il est présent → 9 à 14 caractères
  siret: z
    .string()
    .min(9, "SIRET invalide")
    .max(14, "SIRET invalide")
    .optional()
    .nullable(),

  prenom: z.string().optional().nullable(),
  nom: z.string().optional().nullable(),
});

// Client particulier
export const particulierClientSchema = baseClientSchema.extend({
  type_client: z.literal("PARTICULIER"),
  prenom: z.string().min(1, "Le prénom est obligatoire"),
  nom: z.string().min(1, "Le nom est obligatoire"),
  raison_sociale: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
});

// Union discriminée : PRO / PARTICULIER
export const anyClientSchema = z.discriminatedUnion("type_client", [
  proClientSchema,
  particulierClientSchema,
]);

export type ClientInput = z.infer<typeof anyClientSchema>;

export interface Client extends ClientInput {
  id: string;
  actif: boolean;
  date_creation: string;
  date_modification: string;
}

/**
 * Construit le nom d’affichage selon le type de client
 * PRO → raison sociale
 * PARTICULIER → prénom + nom
 */
export function buildNomAffichage(c: Client | ClientInput): string {
  if (c.type_client === "PRO") {
    return (c as any).raison_sociale ?? "";
  }
  return `${(c as any).prenom ?? ""} ${(c as any).nom ?? ""}`.trim();
}
