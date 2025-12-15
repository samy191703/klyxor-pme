import { db } from '../db';
import { contracts } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script pour initialiser les données d'indexation sur les contrats existants
 * Ajoute des configurations d'indexation aux contrats actifs
 */
export async function initializeIndexationData() {
  try {
    console.log('Initialisation des données d\'indexation...');
    
    // Récupérer les contrats actifs
    const activeContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.status, 'active'));
    
    console.log(`${activeContracts.length} contrats actifs trouvés`);
    
    // Définir les configurations d'indexation par type de contrat
    const indexationConfigs = [
      {
        formula: '2.A',
        frequency: 'annual',
        indices: { ICHT0: 120.5, FM0A0: 140.2 },
        cap: 5,
        threshold: 2
      },
      {
        formula: '2.B',
        frequency: 'quarterly',
        indices: { ICHT0: 121.3, FM0A0: 138.7 },
        cap: 4,
        threshold: 1.5
      },
      {
        formula: '3',
        frequency: 'semi-annual',
        indices: { CPI0: 115.2 },
        cap: 3,
        threshold: 1
      }
    ];
    
    // Mettre à jour chaque contrat avec une configuration d'indexation
    for (let i = 0; i < activeContracts.length; i++) {
      const contract = activeContracts[i];
      const config = indexationConfigs[i % indexationConfigs.length];
      
      // Calculer la prochaine date d'indexation
      const nextIndexDate = new Date();
      if (config.frequency === 'quarterly') {
        nextIndexDate.setMonth(nextIndexDate.getMonth() + 3);
      } else if (config.frequency === 'semi-annual') {
        nextIndexDate.setMonth(nextIndexDate.getMonth() + 6);
      } else { // annual
        nextIndexDate.setFullYear(nextIndexDate.getFullYear() + 1);
      }
      
      // Mettre à jour le contrat
      await db
        .update(contracts)
        .set({
          indexationFrequency: config.frequency,
          indexationFormula: config.formula,
          indexationIndices: config.indices,
          indexationCap: String(config.cap),
          indexationThreshold: String(config.threshold),
          indexationBaseAmount: contract.amount,
          indexationCurrentAmount: contract.amount,
          nextIndexationDate: nextIndexDate,
          lastIndexationDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id));
      
      console.log(`Contrat ${contract.number} configuré avec formule ${config.formula}`);
    }
    
    // Ajouter quelques contrats avec indexation imminente pour tests
    const testContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.status, 'active'))
      .limit(3);
    
    for (const contract of testContracts) {
      const immediateDates = [
        new Date(), // Aujourd'hui
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Dans 2 jours
      ];
      
      const dateIndex = testContracts.indexOf(contract);
      
      await db
        .update(contracts)
        .set({
          nextIndexationDate: immediateDates[dateIndex],
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id));
      
      console.log(`Contrat ${contract.number} configuré pour indexation le ${immediateDates[dateIndex].toLocaleDateString()}`);
    }
    
    console.log('Initialisation des données d\'indexation terminée');
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    throw error;
  }
}

// Exécuter si appelé directement
initializeIndexationData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });