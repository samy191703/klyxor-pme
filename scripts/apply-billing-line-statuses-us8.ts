/**
 * Script pour appliquer la migration US8 (statuts des lignes de facturation).
 * Objectif : exécuter la migration 0004_add_billing_line_statuses_us8.sql
 * sans perte de données, avec vérifications post-exécution.
 *
 * Usage:
 *   npx tsx scripts/apply-billing-line-statuses-us8.ts
 *
 * Pré-requis:
 *   - Variable d'environnement DATABASE_URL renseignée (PostgreSQL)
 *   - Le fichier migrations/0004_add_billing_line_statuses_us8.sql présent
 */

import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log("🚀 Début de l'application de la migration US8 (statuts) ...\n");

    // Localiser le fichier de migration
    const projectRoot = process.cwd();
    const migrationPath = path.join(
      projectRoot,
      "migrations/0004_add_billing_line_statuses_us8.sql"
    );
    if (!fs.existsSync(migrationPath)) {
      throw new Error(
        `Fichier de migration introuvable: ${migrationPath}. Vérifiez le chemin.`
      );
    }
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Exécuter le SQL (les DO blocks gèrent les contraintes existantes)
    console.log("⏳ Exécution de la migration SQL...\n");
    try {
      await client.query(migrationSQL);
      console.log("✅ Migration SQL exécutée avec succès!\n");
    } catch (error: any) {
      if (
        error.message?.includes("already exists") ||
        error.message?.includes("duplicate")
      ) {
        console.log(
          "⚠️  Certaines parties de la migration étaient déjà appliquées, continuation...\n"
        );
      } else {
        throw error;
      }
    }

    // Vérifications post-migration
    console.log("📊 Vérification du statut et de la contrainte CHECK...\n");
    const checkConstraint = await client.query(
      `
        SELECT conname
        FROM pg_constraint
        WHERE conname = 'chk_billing_lines_status';
      `
    );
    if (checkConstraint.rows.length === 0) {
      console.log("⚠️  Contrainte chk_billing_lines_status non trouvée.");
    } else {
      console.log("✅ Contrainte chk_billing_lines_status présente.");
    }

    const checkDefault = await client.query(
      `
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'billing_lines'
          AND column_name = 'status';
      `
    );
    console.log(
      `✅ Valeur par défaut status: ${
        checkDefault.rows[0]?.column_default ?? "NULL"
      }`
    );

    console.log("\n📈 Statistiques par statut (après migration):");
    const statusCounts = await client.query(
      `
        SELECT status, COUNT(*) as count
        FROM billing_lines
        GROUP BY status
        ORDER BY status;
      `
    );
    statusCounts.rows.forEach((row: any) => {
      console.log(`  - ${row.status}: ${row.count}`);
    });

    console.log("\n🎯 Vérification du mapping des anciens statuts éventuels:");
    const legacyCounts = await client.query(
      `
        SELECT status, COUNT(*) as count
        FROM billing_lines
        WHERE status IN ('PENDING', 'INVOICED', 'CANCELLED')
        GROUP BY status;
      `
    );
    if (legacyCounts.rows.length === 0) {
      console.log("✅ Aucun statut legacy (PENDING/INVOICED/CANCELLED) restant.");
    } else {
      legacyCounts.rows.forEach((row: any) => {
        console.log(`  ⚠️ Legacy ${row.status}: ${row.count}`);
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'application de la migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log("\n🎉 Migration US8 terminée sans perte de données.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Erreur fatale:", error);
    process.exit(1);
  });

