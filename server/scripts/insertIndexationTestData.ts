/**
 * Script pour insérer les données de test d'indexation
 * Basé sur le document fourni avec 4 contrats de test
 */

import { db } from "../db";
import { contracts, indexationFormulas, indexValues } from "@shared/schema";
import { eq } from "drizzle-orm";

async function insertTestData() {
  console.log("Insertion des données de test d'indexation...");

  try {
    // ========== 1. CRÉER LES FORMULES D'INDEXATION ==========
    console.log("Création des formules d'indexation...");

    // Formule 1: Simple ICHT
    const formula1 = await db
      .insert(indexationFormulas)
      .values({
        name: "Formule ICHT Simple",
        expression: "P = P₀ × (ICHTREV / ICHT₀)",
        variables: ["ICHT"],
        description: "Indexation simple basée sur l'indice ICHT",
        type: "Type 1",
        isActive: true,
      })
      .returning();

    // Formule 2: Pondérée ICHT/FMOA
    const formula2 = await db
      .insert(indexationFormulas)
      .values({
        name: "Formule Pondérée ICHT/FMOA",
        expression:
          "P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))",
        variables: ["ICHT", "FMOA"],
        description: "Formule pondérée avec coefficients fixes",
        type: "Type 2.A",
        isActive: true,
      })
      .returning();

    // Formule 3: CPI
    const formula3 = await db
      .insert(indexationFormulas)
      .values({
        name: "Formule CPI",
        expression: "P = Pₙ₋₁ × (1 + CPI)",
        variables: ["CPI"],
        description: "Indexation basée sur l'indice des prix à la consommation",
        type: "Type 3",
        isActive: true,
      })
      .returning();

    console.log("✓ Formules créées");

    // ========== 2. CRÉER LES CONTRATS DE TEST ==========
    console.log("Création des contrats de test...");

    // Contrat 1: Parc Auxerrois
    await db
      .insert(contracts)
      .values({
        number: "AUX89-2024",
        parkCode: "AUX89",
        title: "Parc Auxerrois - Maintenance éolienne",
        status: "active",
        type: "maintenance",
        businessUnit: "ENGIE Green",
        amount: 128000,
        currency: "EUR",
        date: new Date("2023-01-01"),

        startDate: new Date("2024-01-01"),
        endDate: new Date("2026-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-09-24"),
        indexationFormulaId: formula1[0].id,
        indexationBaseAmount: 128000,
        indexationCurrentAmount: 128000,
        indexationIndices: { ICHT0: 115.7 },
        indexationCap: 0,
        indexationThreshold: 0,
        calculationMode: "P0",
        indexTakingDate: new Date("2024-09-01"), // Date de prise = date d'indexation
        createdBy: "system",
      })
      .returning();

    // Contrat 2: Parc Figanières
    await db
      .insert(contracts)
      .values({
        number: "FIG83-2024",
        parkCode: "FIG83",
        title: "Parc Figanières - Production solaire",
        status: "active",
        type: "renewable_ppa",
        businessUnit: "ENGIE Green",
        amount: 437000,
        currency: "EUR",

        startDate: new Date("2024-01-01"),
        endDate: new Date("2029-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-09-01"),
        indexationFormulaId: formula2[0].id,
        indexationBaseAmount: 437000,
        indexationCurrentAmount: 437000,
        indexationIndices: { ICHT0: 113.4, FMOA0: 91.57 },
        indexationCap: 0,
        indexationThreshold: 0,
        calculationMode: "P0",
        indexTakingDate: new Date("2024-09-01"),
        createdBy: "system",
        date: new Date("2023-01-01"),
      })
      .returning();

    // Contrat 3: Parc SCAER LE MERDY
    await db
      .insert(contracts)
      .values({
        number: "SCM29-2024",
        parkCode: "SCM29",
        title: "Parc SCAER LE MERDY - Biomasse",
        status: "active",
        type: "energy_supply",
        businessUnit: "ENGIE Solutions France",
        amount: 52919.2,
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-09-01"),
        indexationFormulaId: formula3[0].id,
        indexationBaseAmount: 52000,
        indexationCurrentAmount: 52919.2,
        indexationIndices: {},
        indexationCap: 0,
        indexationThreshold: 2, // Seuil 2%
        calculationMode: "Pn-1", // Mode Pₙ₋₁
        indexTakingDate: new Date("2024-09-01"),
        createdBy: "system",
        date: new Date("2023-01-01"),
      })
      .returning();

    // Contrat 4: Parc Gréoux 1
    await db
      .insert(contracts)
      .values({
        number: "GLB04-2024",
        parkCode: "GLB04",
        title: "Parc Gréoux 1 - Géothermie",
        status: "active",
        type: "energy_supply",
        businessUnit: "ENGIE Flex",
        amount: 141480,
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2027-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2025-01-01"),
        indexationFormulaId: formula2[0].id,
        indexationBaseAmount: 141480,
        indexationCurrentAmount: 141480,
        indexationIndices: { ICHT0: 128.2, FMOA0: 97.93 },
        indexationCap: 2, // Cap 2%
        indexationThreshold: 0,
        calculationMode: "P0",
        indexTakingDate: new Date("2024-11-01"), // Date de prise différente (N-1)
        createdBy: "system",
        date: new Date("2023-01-01"),
      })
      .returning();

    console.log("✓ 4 contrats de test créés");

    // ========== 3. CRÉER DES VALEURS D'INDICES ==========
    console.log("Création des valeurs d'indices économiques...");

    const indexDates = [
      new Date("2024-01-01"),
      new Date("2024-02-01"),
      new Date("2024-03-01"),
      new Date("2024-04-01"),
      new Date("2024-05-01"),
      new Date("2024-06-01"),
      new Date("2024-07-01"),
      new Date("2024-08-01"),
      new Date("2024-09-01"),
      new Date("2024-10-01"),
      new Date("2024-11-01"),
    ];

    // ICHT - Indice du Coût Horaire du Travail
    let ichtBase = 115.7;
    for (const date of indexDates) {
      const variation = Math.random() * 2 - 0.5; // Variation entre -0.5% et +1.5%
      ichtBase = ichtBase * (1 + variation / 100);

      await db.insert(indexValues).values({
        indexCode: "ICHT",
        indexName: "Indice du Coût Horaire du Travail",
        source: "INSEE",
        period: date,
        publicationDate: new Date(date.getTime() + 60 * 24 * 60 * 60 * 1000), // +60 jours
        value: Math.round(ichtBase * 100) / 100,
        status:
          date < new Date("2024-07-01")
            ? "final"
            : date < new Date("2024-09-01")
            ? "revised"
            : "provisional",
        variation: variation,
        isLatest: date.getMonth() === 10, // Novembre est le dernier
      });
    }

    // FMOA - Frais et services divers
    let fmoaBase = 91.57;
    for (const date of indexDates) {
      const variation = Math.random() * 2.5 - 0.5; // Variation entre -0.5% et +2%
      fmoaBase = fmoaBase * (1 + variation / 100);

      await db.insert(indexValues).values({
        indexCode: "FMOA",
        indexName: "Frais et services divers",
        source: "INSEE",
        period: date,
        publicationDate: new Date(date.getTime() + 60 * 24 * 60 * 60 * 1000),
        value: Math.round(fmoaBase * 100) / 100,
        status:
          date < new Date("2024-07-01")
            ? "final"
            : date < new Date("2024-09-01")
            ? "revised"
            : "provisional",
        variation: variation,
        isLatest: date.getMonth() === 10,
      });
    }

    // CPI - Consumer Price Index
    let cpiBase = 100;
    for (const date of indexDates) {
      const variation = Math.random() * 3 - 0.5; // Variation entre -0.5% et +2.5%
      cpiBase = cpiBase * (1 + variation / 100);

      await db.insert(indexValues).values({
        indexCode: "CPI",
        indexName: "Indice des Prix à la Consommation",
        source: "INSEE",
        period: date,
        publicationDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        value: Math.round(cpiBase * 100) / 100,
        status: date < new Date("2024-08-01") ? "final" : "provisional",
        variation: variation,
        isLatest: date.getMonth() === 10,
      });
    }

    console.log("✓ Valeurs d'indices créées pour ICHT, FMOA et CPI");

    console.log("\n✅ DONNÉES DE TEST INSÉRÉES AVEC SUCCÈS !");
    console.log("\n📊 Résumé :");
    console.log("- 3 formules d'indexation");
    console.log("- 4 contrats avec paramètres spécifiques");
    console.log("- 33 valeurs d'indices économiques");
    console.log("\n🔗 Cas de test configurés :");
    console.log("1. AUX89 : Formule simple, date prise = date indexation");
    console.log("2. FIG83 : Formule pondérée, sans cap ni seuil");
    console.log("3. SCM29 : Mode Pₙ₋₁, seuil 2%");
    console.log("4. GLB04 : Date prise N-1, cap 2%");
  } catch (error) {
    console.error("❌ Erreur lors de l'insertion des données :", error);
  }
}

// Exécution du script
insertTestData();

export { insertTestData };
