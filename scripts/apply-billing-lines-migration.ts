/**
 * Script pour appliquer la migration 0003_add_billing_lines_dates.sql
 * Applique uniquement les changements nécessaires sans toucher aux autres tables
 * 
 * Usage: npx tsx scripts/apply-billing-lines-migration.ts
 */

import "dotenv/config";
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Début de l\'application de la migration...\n');

    // Lire le fichier migration
    // Utiliser process.cwd() pour obtenir le répertoire racine du projet
    const projectRoot = process.cwd();
    const migrationPath = path.join(projectRoot, 'migrations/0003_add_billing_lines_dates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Exécuter tout le SQL en une fois (les DO blocks gèrent déjà les vérifications)
    console.log('⏳ Exécution de la migration SQL...\n');
    
    try {
      await client.query(migrationSQL);
      console.log('✅ Migration SQL exécutée avec succès!\n');
    } catch (error: any) {
      // Si certaines colonnes existent déjà, ce n'est pas grave
      if (error.message?.includes('already exists') || 
          error.message?.includes('duplicate')) {
        console.log('⚠️  Certaines parties de la migration étaient déjà appliquées, continuation...\n');
      } else {
        throw error;
      }
    }

    console.log('📊 Vérification des colonnes ajoutées...\n');

    // Vérifier que les colonnes ont été ajoutées
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'billing_lines'
      AND column_name IN ('billing_start_date', 'billing_end_date', 'invoice_date')
      ORDER BY column_name;
    `);

    if (checkResult.rows.length === 0) {
      console.log('⚠️  Aucune colonne trouvée. La migration n\'a peut-être pas été appliquée.');
    } else {
      console.log('Colonnes trouvées:');
      checkResult.rows.forEach((row: any) => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    // Compter les lignes avec les nouvelles colonnes
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(billing_start_date) as with_start_date,
        COUNT(billing_end_date) as with_end_date,
        COUNT(invoice_date) as with_invoice_date
      FROM billing_lines;
    `);

    console.log('\n📈 Statistiques:');
    console.log(`  - Total de lignes: ${countResult.rows[0].total}`);
    console.log(`  - Avec billing_start_date: ${countResult.rows[0].with_start_date}`);
    console.log(`  - Avec billing_end_date: ${countResult.rows[0].with_end_date}`);
    console.log(`  - Avec invoice_date: ${countResult.rows[0].with_invoice_date}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
applyMigration()
  .then(() => {
    console.log('\n🎉 Migration terminée avec succès!');
    console.log('💡 Vous pouvez maintenant utiliser "npm run db:push" pour synchroniser le schema.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  });

