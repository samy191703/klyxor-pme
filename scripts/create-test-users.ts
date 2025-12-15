/**
 * Script de création des utilisateurs de test KLYXOR
 * Exécuter avec: npx tsx scripts/create-test-users.ts
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function createTestUsers() {
  console.log('🚀 Création des utilisateurs de test KLYXOR...\n');
  
  const testUsers = [
    // Administrateurs
    { username: 'admin1', password: 'Admin123!', name: 'Administrateur Principal', email: 'admin1@engie.fr', role: 'admin' },
    { username: 'admin2', password: 'Admin123!', name: 'Administrateur Secondaire', email: 'admin2@engie.fr', role: 'admin' },
    { username: 'admin3', password: 'Admin123!', name: 'Administrateur Système', email: 'admin3@engie.fr', role: 'admin' },
    
    // Gestionnaires
    { username: 'gestionnaire1', password: 'Gest123!', name: 'Marc Gestionnaire', email: 'gestionnaire1@engie.fr', role: 'manager' },
    { username: 'gestionnaire2', password: 'Gest123!', name: 'Sophie Gestionnaire', email: 'gestionnaire2@engie.fr', role: 'manager' },
    { username: 'gestionnaire3', password: 'Gest123!', name: 'Pierre Gestionnaire', email: 'gestionnaire3@engie.fr', role: 'manager' },
    
    // Validateurs
    { username: 'validateur1', password: 'Valid123!', name: 'Claire Validation', email: 'validateur1@engie.fr', role: 'validator' },
    { username: 'validateur2', password: 'Valid123!', name: 'Thomas Validation', email: 'validateur2@engie.fr', role: 'validator' },
    { username: 'validateur3', password: 'Valid123!', name: 'Marie Validation', email: 'validateur3@engie.fr', role: 'validator' },
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const user of testUsers) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existing = await db.select()
        .from(users)
        .where(eq(users.username, user.username))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  Utilisateur ${user.username} existe déjà`);
        skipped++;
        continue;
      }
      
      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Créer l'utilisateur
      await db.insert(users).values({
        username: user.username,
        password: hashedPassword,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      console.log(`✅ Créé: ${user.username} (${user.role}) - Mot de passe: ${user.password}`);
      created++;
      
    } catch (error) {
      console.error(`❌ Erreur pour ${user.username}:`, error);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`   ✅ ${created} utilisateurs créés`);
  console.log(`   ⏭️  ${skipped} utilisateurs existants`);
  console.log('\n🔐 Identifiants de connexion:');
  console.log('   Admins: admin1, admin2, admin3 / Admin123!');
  console.log('   Gestionnaires: gestionnaire1, gestionnaire2, gestionnaire3 / Gest123!');
  console.log('   Validateurs: validateur1, validateur2, validateur3 / Valid123!');
  
  process.exit(0);
}

// Exécuter le script
createTestUsers().catch(console.error);