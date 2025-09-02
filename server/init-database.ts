import { db } from "./db";
import { 
  contracts, 
  amendments, 
  deadlines, 
  validationRequests,
  activityLogs,
  alerts,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function initializeDatabase() {
  console.log("🚀 Initialisation de la base de données KLYXOR pour ENGIE...");
  
  try {
    // Nettoyer les tables existantes (sauf indexation_formulas et indexations)
    console.log("🧹 Nettoyage des données existantes...");
    await db.delete(amendments);
    await db.delete(deadlines);
    await db.delete(validationRequests);
    await db.delete(activityLogs);
    await db.delete(alerts);
    await db.delete(contracts);
    await db.delete(users);
    
    // Créer les utilisateurs ENGIE
    console.log("👥 Création des utilisateurs ENGIE...");
    const engieUsers = await db.insert(users).values([
      {
        username: "marie.dupont",
        password: "password123",
        name: "Marie Dupont",
        role: "contract_manager",
        email: "marie.dupont@engie.com"
      },
      {
        username: "jean.martin",
        password: "password123", 
        name: "Jean Martin",
        role: "validator",
        email: "jean.martin@engie.com"
      },
      {
        username: "sophie.bernard",
        password: "password123",
        name: "Sophie Bernard",
        role: "finance_manager",
        email: "sophie.bernard@engie.com"
      },
      {
        username: "pierre.leclerc",
        password: "password123",
        name: "Pierre Leclerc",
        role: "business_unit_manager",
        email: "pierre.leclerc@engie.com"
      },
      {
        username: "admin",
        password: "admin123",
        name: "Administrateur Système",
        role: "admin",
        email: "admin@engie.com"
      }
    ]).returning();
    
    const [marie, jean, sophie, pierre, admin] = engieUsers;
    
    // Créer des contrats énergétiques réalistes
    console.log("📄 Création des contrats énergétiques...");
    const engieContracts = await db.insert(contracts).values([
      // Contrats éoliens
      {
        number: "WIND-2024-001",
        title: "Parc Éolien Hauts-de-France - 120MW",
        status: "active",
        type: "energy_production",
        businessUnit: "ENGIE Green",
        amount: "45000000",
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2044-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2025-01-01"),
        createdBy: marie.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      },
      {
        number: "WIND-2024-002",
        title: "Parc Éolien Bretagne Sud - 80MW",
        status: "active",
        type: "energy_production",
        businessUnit: "ENGIE Green",
        amount: "32000000",
        currency: "EUR",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2044-03-14"),
        indexationFrequency: "quarterly",
        nextIndexationDate: new Date("2025-03-15"),
        createdBy: marie.id,
        validatedBy: pierre.id,
        hasRequiredDocuments: true
      },
      
      // Contrats solaires
      {
        number: "SOLAR-2024-001",
        title: "Centrale Photovoltaïque Provence - 150MW",
        status: "active",
        type: "energy_production",
        businessUnit: "ENGIE Green",
        amount: "58000000",
        currency: "EUR",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2049-01-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2025-02-01"),
        createdBy: sophie.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      },
      {
        number: "SOLAR-2024-002",
        title: "Toitures Solaires Industrielles - Région Lyon",
        status: "pending_validation",
        type: "energy_production",
        businessUnit: "ENGIE Solutions France",
        amount: "12500000",
        currency: "EUR",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2044-05-31"),
        indexationFrequency: "semi_annual",
        nextIndexationDate: new Date("2024-12-01"),
        createdBy: marie.id,
        validatedBy: null,
        hasRequiredDocuments: false
      },
      
      // Contrats de maintenance
      {
        number: "MAINT-2024-001",
        title: "Maintenance Parc Éolien Normandie",
        status: "active",
        type: "maintenance",
        businessUnit: "ENGIE Solutions France",
        amount: "2400000",
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2029-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2025-01-01"),
        createdBy: pierre.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      },
      {
        number: "MAINT-2024-002",
        title: "Maintenance Réseau Chaleur Urbain - Lille Métropole",
        status: "active",
        type: "maintenance",
        businessUnit: "ENGIE Solutions France",
        amount: "8750000",
        currency: "EUR",
        startDate: new Date("2023-07-01"),
        endDate: new Date("2033-06-30"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-07-01"),
        createdBy: sophie.id,
        validatedBy: pierre.id,
        hasRequiredDocuments: true
      },
      
      // Contrats PPA (Power Purchase Agreement)
      {
        number: "PPA-2024-001",
        title: "PPA Corporate - Groupe Carrefour 100MW",
        status: "active",
        type: "power_purchase",
        businessUnit: "ENGIE Global Energy Management",
        amount: "180000000",
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2039-12-31"),
        indexationFrequency: "quarterly",
        nextIndexationDate: new Date("2025-01-01"),
        createdBy: marie.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      },
      {
        number: "PPA-2024-002",
        title: "PPA Google Data Centers - 200MW Renouvelable",
        status: "active",
        type: "power_purchase",
        businessUnit: "ENGIE Global Energy Management",
        amount: "350000000",
        currency: "EUR",
        startDate: new Date("2023-10-01"),
        endDate: new Date("2043-09-30"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-10-01"),
        createdBy: sophie.id,
        validatedBy: pierre.id,
        hasRequiredDocuments: true
      },
      
      // Contrats de fourniture gaz
      {
        number: "GAS-2024-001",
        title: "Fourniture Gaz Industriel - Zone Nord",
        status: "active",
        type: "gas_supply",
        businessUnit: "ENGIE Global Energy Management",
        amount: "25000000",
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2027-12-31"),
        indexationFrequency: "monthly",
        nextIndexationDate: new Date("2024-12-01"),
        createdBy: pierre.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      },
      
      // Contrats de flexibilité
      {
        number: "FLEX-2024-001",
        title: "Services Flexibilité - Batteries 50MW",
        status: "active",
        type: "flexibility_services",
        businessUnit: "ENGIE Flex",
        amount: "15000000",
        currency: "EUR",
        startDate: new Date("2024-04-01"),
        endDate: new Date("2034-03-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2025-04-01"),
        createdBy: marie.id,
        validatedBy: sophie.id,
        hasRequiredDocuments: true
      },
      
      // Contrat hydrogène
      {
        number: "H2-2024-001",
        title: "Production Hydrogène Vert - Dunkerque",
        status: "draft",
        type: "hydrogen_production",
        businessUnit: "ENGIE Solutions France",
        amount: "95000000",
        currency: "EUR",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2045-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2026-01-01"),
        createdBy: sophie.id,
        validatedBy: null,
        hasRequiredDocuments: false
      },
      
      // Contrat géothermie
      {
        number: "GEO-2024-001",
        title: "Réseau Géothermie Profonde - Alsace",
        status: "active",
        type: "geothermal",
        businessUnit: "ENGIE Solutions France",
        amount: "42000000",
        currency: "EUR",
        startDate: new Date("2023-06-01"),
        endDate: new Date("2048-05-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-06-01"),
        createdBy: pierre.id,
        validatedBy: jean.id,
        hasRequiredDocuments: true
      }
    ]).returning();
    
    console.log(`✅ ${engieContracts.length} contrats créés`);
    
    // Créer des avenants pour certains contrats
    console.log("📝 Création des avenants...");
    const contractAmendments = await db.insert(amendments).values([
      {
        contractId: engieContracts[0].id,
        number: "AVN-2024-001",
        type: "scope_change",
        title: "Extension capacité +20MW",
        description: "Ajout de 5 éoliennes supplémentaires sur le site existant",
        status: "active",
        effectiveDate: new Date("2024-09-01"),
        originalAmount: "45000000",
        newAmount: "52000000",
        impactDescription: "Augmentation de la capacité de production de 120MW à 140MW",
        requestedBy: marie.id,
        approvedBy: jean.id,
        signedDate: new Date("2024-08-15")
      },
      {
        contractId: engieContracts[2].id,
        number: "AVN-2024-002",
        type: "indexation_change",
        title: "Modification formule indexation",
        description: "Changement de la formule d'indexation suite évolution réglementaire",
        status: "pending_signature",
        effectiveDate: new Date("2025-01-01"),
        originalAmount: "58000000",
        newAmount: "58000000",
        impactDescription: "Passage de Type 2.A à Type 2.B pour adaptation CRE8",
        requestedBy: sophie.id,
        approvedBy: pierre.id,
        signedDate: null
      },
      {
        contractId: engieContracts[6].id,
        number: "AVN-2024-003",
        type: "duration_extension",
        title: "Prolongation contrat PPA 5 ans",
        description: "Extension de la durée du PPA de 15 à 20 ans",
        status: "active",
        effectiveDate: new Date("2024-07-01"),
        originalAmount: "180000000",
        newAmount: "240000000",
        impactDescription: "Extension jusqu'en 2044 avec ajustement tarifaire",
        requestedBy: marie.id,
        approvedBy: jean.id,
        signedDate: new Date("2024-06-20")
      },
      {
        contractId: engieContracts[4].id,
        number: "AVN-2024-004",
        type: "price_revision",
        title: "Révision tarifaire maintenance",
        description: "Ajustement des tarifs suite inflation exceptionnelle",
        status: "draft",
        effectiveDate: new Date("2025-01-01"),
        originalAmount: "2400000",
        newAmount: "2580000",
        impactDescription: "Augmentation de 7.5% des tarifs de maintenance",
        requestedBy: pierre.id,
        approvedBy: null,
        signedDate: null
      },
      {
        contractId: engieContracts[7].id,
        number: "AVN-2024-005",
        type: "scope_change",
        title: "Ajout datacenter Frankfurt",
        description: "Extension du périmètre PPA pour nouveau datacenter Google",
        status: "active",
        effectiveDate: new Date("2024-10-01"),
        originalAmount: "350000000",
        newAmount: "420000000",
        impactDescription: "Ajout de 50MW pour le nouveau site de Frankfurt",
        requestedBy: sophie.id,
        approvedBy: pierre.id,
        signedDate: new Date("2024-09-15")
      }
    ]).returning();
    
    console.log(`✅ ${contractAmendments.length} avenants créés`);
    
    // Créer des échéances
    console.log("📅 Création des échéances...");
    const contractDeadlines = await db.insert(deadlines).values([
      {
        contractId: engieContracts[8].id,
        contractNumber: "GAS-2024-001",
        type: "end_contract",
        date: new Date("2027-12-31"),
        daysRemaining: Math.floor((new Date("2027-12-31").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        businessUnit: "ENGIE Global Energy Management",
        notificationSent: false
      },
      {
        contractId: engieContracts[5].id,
        contractNumber: "MAINT-2024-002",
        type: "anniversary",
        date: new Date("2024-07-01"),
        daysRemaining: Math.floor((new Date("2024-07-01").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        businessUnit: "ENGIE Solutions France",
        notificationSent: true
      },
      {
        contractId: engieContracts[0].id,
        contractNumber: "WIND-2024-001",
        type: "anniversary",
        date: new Date("2025-01-01"),
        daysRemaining: Math.floor((new Date("2025-01-01").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        businessUnit: "ENGIE Green",
        notificationSent: false
      },
      {
        contractId: engieContracts[3].id,
        contractNumber: "SOLAR-2024-002",
        type: "amendment",
        date: new Date("2024-12-15"),
        daysRemaining: Math.floor((new Date("2024-12-15").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        businessUnit: "ENGIE Solutions France",
        notificationSent: false
      }
    ]).returning();
    
    console.log(`✅ ${contractDeadlines.length} échéances créées`);
    
    // Créer des demandes de validation
    console.log("✔️ Création des demandes de validation...");
    const validations = await db.insert(validationRequests).values([
      {
        type: "contract",
        referenceId: engieContracts[3].id,
        reference: "SOLAR-2024-002",
        subject: "Validation contrat toitures solaires Lyon",
        requestedBy: marie.id,
        assignedTo: jean.id,
        status: "pending",
        reason: "Nouveau contrat à valider avant signature"
      },
      {
        type: "amendment",
        referenceId: contractAmendments[1].id,
        reference: "AVN-2024-002",
        subject: "Validation avenant modification indexation",
        requestedBy: sophie.id,
        assignedTo: pierre.id,
        status: "pending",
        reason: "Changement de formule d'indexation suite CRE8"
      },
      {
        type: "manual_amount",
        referenceId: engieContracts[10].id,
        reference: "H2-2024-001",
        subject: "Validation montant exceptionnel hydrogène",
        requestedBy: sophie.id,
        assignedTo: jean.id,
        status: "pending",
        reason: "Montant > 50M€ nécessite validation direction"
      }
    ]).returning();
    
    console.log(`✅ ${validations.length} demandes de validation créées`);
    
    // Créer des alertes
    console.log("🔔 Création des alertes...");
    const systemAlerts = await db.insert(alerts).values([
      {
        type: "warning",
        category: "deadline",
        title: "Échéance proche - GAS-2024-001",
        message: "Le contrat de fourniture gaz arrive à échéance dans 3 ans. Prévoir renouvellement.",
        isRead: false,
        referenceId: engieContracts[8].id
      },
      {
        type: "info",
        category: "validation",
        title: "Nouveau contrat en attente",
        message: "Le contrat SOLAR-2024-002 est en attente de validation",
        isRead: false,
        referenceId: engieContracts[3].id
      },
      {
        type: "critical",
        category: "workflow_delay",
        title: "Retard validation avenant",
        message: "L'avenant AVN-2024-002 est en attente depuis plus de 15 jours",
        isRead: false,
        referenceId: contractAmendments[1].id
      }
    ]).returning();
    
    console.log(`✅ ${systemAlerts.length} alertes créées`);
    
    // Créer quelques logs d'activité
    console.log("📊 Création des logs d'activité...");
    const logs = await db.insert(activityLogs).values([
      {
        userId: marie.id,
        userName: "Marie Dupont",
        action: "CREATE",
        entityType: "contract",
        entityId: engieContracts[0].id,
        entityReference: "WIND-2024-001",
        details: "Création du contrat parc éolien Hauts-de-France"
      },
      {
        userId: jean.id,
        userName: "Jean Martin",
        action: "VALIDATE",
        entityType: "contract",
        entityId: engieContracts[0].id,
        entityReference: "WIND-2024-001",
        details: "Validation du contrat après revue juridique"
      },
      {
        userId: sophie.id,
        userName: "Sophie Bernard",
        action: "CREATE",
        entityType: "amendment",
        entityId: contractAmendments[1].id,
        entityReference: "AVN-2024-002",
        details: "Création avenant modification indexation"
      },
      {
        userId: pierre.id,
        userName: "Pierre Leclerc",
        action: "APPROVE",
        entityType: "amendment",
        entityId: contractAmendments[4].id,
        entityReference: "AVN-2024-005",
        details: "Approbation extension datacenter Frankfurt"
      }
    ]).returning();
    
    console.log(`✅ ${logs.length} logs d'activité créés`);
    
    console.log("\n✨ Base de données initialisée avec succès!");
    console.log("📊 Résumé:");
    console.log(`   - ${engieUsers.length} utilisateurs`);
    console.log(`   - ${engieContracts.length} contrats`);
    console.log(`   - ${contractAmendments.length} avenants`);
    console.log(`   - ${contractDeadlines.length} échéances`);
    console.log(`   - ${validations.length} demandes de validation`);
    console.log(`   - ${systemAlerts.length} alertes`);
    console.log(`   - ${logs.length} logs d'activité`);
    console.log("\n🎯 Les formules d'indexation ont été conservées");
    
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation:", error);
    throw error;
  }
}

// Exécuter l'initialisation
initializeDatabase()
  .then(() => {
    console.log("✅ Initialisation terminée");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });