import { db } from '../db';
import { contracts } from '@shared/schema';

/**
 * Script pour créer des contrats de test avec configuration d'indexation
 */
async function seedIndexationContracts() {
  try {
    console.log('Création de contrats avec indexation configurée...');
    
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const nextQuarter = new Date(today);
    nextQuarter.setMonth(nextQuarter.getMonth() + 3);
    
    const testContracts = [
      {
        number: 'CNT-IDX-001',
        title: 'Contrat Test Indexation Annuelle',
        status: 'active',
        type: 'electricity',
        businessUnit: 'ENGIE Solutions France',
        amount: '100000',
        currency: 'EUR',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        indexationFrequency: 'annual',
        indexationFormula: '2.A',
        indexationBaseAmount: '100000',
        indexationCurrentAmount: '100000',
        indexationIndices: { ICHT0: 120.5, FM0A0: 140.2 },
        indexationCap: '5',
        indexationThreshold: '2',
        nextIndexationDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Demain
        lastIndexationDate: new Date('2024-01-01'),
        createdBy: 'system',
        hasRequiredDocuments: true
      },
      {
        number: 'CNT-IDX-002',
        title: 'Contrat Test Indexation Trimestrielle',
        status: 'active',
        type: 'gas',
        businessUnit: 'ENGIE Green',
        amount: '150000',
        currency: 'EUR',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
        indexationFrequency: 'quarterly',
        indexationFormula: '2.B',
        indexationBaseAmount: '150000',
        indexationCurrentAmount: '155000',
        indexationIndices: { ICHT0: 121.3, FM0A0: 138.7 },
        indexationCap: '4',
        indexationThreshold: '1.5',
        nextIndexationDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
        lastIndexationDate: new Date('2024-10-01'),
        createdBy: 'system',
        hasRequiredDocuments: true
      },
      {
        number: 'CNT-IDX-003',
        title: 'Contrat Test Indexation Mensuelle',
        status: 'active',
        type: 'ppa',
        businessUnit: 'ENGIE Flex',
        amount: '200000',
        currency: 'EUR',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2027-12-31'),
        indexationFrequency: 'monthly',
        indexationFormula: '3',
        indexationBaseAmount: '200000',
        indexationCurrentAmount: '205000',
        indexationIndices: { CPI0: 115.2 },
        indexationCap: '3',
        indexationThreshold: '1',
        nextIndexationDate: today, // Aujourd'hui
        lastIndexationDate: new Date('2024-12-01'),
        createdBy: 'system',
        hasRequiredDocuments: true
      }
    ];
    
    for (const contract of testContracts) {
      const [created] = await db
        .insert(contracts)
        .values(contract)
        .returning();
      
      console.log(`Contrat créé: ${created.number} - Indexation ${created.indexationFrequency} - Prochaine date: ${created.nextIndexationDate?.toLocaleDateString()}`);
    }
    
    console.log('Création des contrats terminée avec succès');
    
  } catch (error) {
    console.error('Erreur lors de la création des contrats:', error);
    throw error;
  }
}

// Exécuter le script
seedIndexationContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });