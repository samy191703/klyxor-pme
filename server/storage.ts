/**
 * Module de stockage KLYXOR - Couche d'abstraction de base de données
 * Implémente toutes les opérations CRUD pour les entités du système
 * Utilise Drizzle ORM avec PostgreSQL
 */
import {
  users,
  contracts,
  validationRequests,
  indexations,
  indexationFormulas,
  indexationProposals,
  deadlines,
  alerts,
  notificationPreferences,
  auditLogs,
  activityLogs,
  importLogs,
  amendments,
  terminations,
  paymentBlocks,
  paymentProofs,
  documents,
  exportJobs,
  securityEvents,
  reminders,
  workflowDefinitions,
  workflowInstances,
  type User,
  type InsertUser,
  type Contract,
  type InsertContract,
  type ValidationRequest,
  type InsertValidationRequest,
  type Indexation,
  type InsertIndexation,
  type IndexationFormula,
  type InsertIndexationFormula,
  type IndexationProposal,
  type InsertIndexationProposal,
  type Deadline,
  type InsertDeadline,
  type Alert,
  type InsertAlert,
  type NotificationPreference,
  type InsertNotificationPreference,
  type AuditLog,
  type InsertAuditLog,
  type ActivityLog,
  type InsertActivityLog,
  type ImportLog,
  type InsertImportLog,
  type Amendment,
  type InsertAmendment,
  type Termination,
  type InsertTermination,
  type PaymentBlock,
  type InsertPaymentBlock,
  type PaymentProof,
  type InsertPaymentProof,
  type Document,
  type InsertDocument,
  type ExportJob,
  type InsertExportJob,
  type SecurityEvent,
  type InsertSecurityEvent,
  type Reminder,
  type InsertReminder,
  type WorkflowDefinition,
  type InsertWorkflowDefinition,
  type WorkflowInstance,
  type InsertWorkflowInstance,
  economicIndices,
  type SelectEconomicIndex,
  type InsertEconomicIndex,
  validationAssignments,
  type SelectValidationAssignment,
  type InsertValidationAssignment,
  indexationFrequencies,
  type SelectIndexationFrequency,
  type InsertIndexationFrequency,
  indexValues,
  type IndexValue,
  type InsertIndexValue,
  codeSnippets,
  type CodeSnippet,
  type InsertCodeSnippet,
  type InsertValidationRequestsRule,
  type ValidationRequestsRule,
  validationRequestsRules,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, gt, sql } from "drizzle-orm";

/**
 * Interface de stockage principale
 * Définit toutes les opérations de base de données disponibles
 */
export interface IStorage {
  // ========== GESTION DES UTILISATEURS ==========
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // ========== GESTION DES SNIPPETS DE CODE ==========
  getCodeSnippets(userId?: string): Promise<CodeSnippet[]>;
  getCodeSnippet(id: string): Promise<CodeSnippet | undefined>;
  getCodeSnippetsByContext(
    context: string,
    contextId?: string
  ): Promise<CodeSnippet[]>;
  createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet>;
  updateCodeSnippet(
    id: string,
    snippet: Partial<CodeSnippet>
  ): Promise<CodeSnippet | undefined>;
  deleteCodeSnippet(id: string): Promise<boolean>;
  incrementSnippetViewCount(id: string): Promise<void>;
  incrementSnippetCopyCount(id: string): Promise<void>;

  // ========== GESTION DES CONTRATS ==========
  getContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(
    id: string,
    contract: Partial<Contract>
  ): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;

  // ========== GESTION DES AVENANTS ==========
  getAmendments(): Promise<Amendment[]>;
  getAmendmentsByContractId(contractId: string): Promise<Amendment[]>;
  getAmendment(id: string): Promise<Amendment | undefined>;
  createAmendment(amendment: InsertAmendment): Promise<Amendment>;
  updateAmendment(
    id: string,
    amendment: Partial<Amendment>
  ): Promise<Amendment | undefined>;
  deleteAmendment(id: string): Promise<boolean>;

  // Terminations
  getTerminations(): Promise<Termination[]>;
  getTerminationsByContractId(contractId: string): Promise<Termination[]>;
  getTermination(id: string): Promise<Termination | undefined>;
  createTermination(termination: InsertTermination): Promise<Termination>;
  updateTermination(
    id: string,
    termination: Partial<Termination>
  ): Promise<Termination | undefined>;
  deleteTermination(id: string): Promise<boolean>;

  // ========== WORKFLOW DE VALIDATION ==========
  getValidationRequests(): Promise<ValidationRequest[]>;
  getValidationRequest(id: string): Promise<ValidationRequest | undefined>;
  createValidationRequest(
    request: InsertValidationRequest
  ): Promise<ValidationRequest>;
  updateValidationRequest(
    id: string,
    request: Partial<ValidationRequest>
  ): Promise<ValidationRequest | undefined>;

  // after your existing validation requests methods
  findValidationRequests(filters?: {
    status?: ValidationRequest["status"][]; // 'pending' | 'approved' | 'rejected' | 'redirected'
    type?: string;
    assignedTo?: string;
    requestedBy?: string;
    referenceId?: string;
    search?: string; // matches subject/reference (client-side filtered)
    limit?: number;
    offset?: number;
  }): Promise<ValidationRequest[]>;

  bulkUpdateValidationRequests(
    ids: string[],
    patch: Partial<ValidationRequest>
  ): Promise<ValidationRequest[]>;

  incrementAgesForPending(): Promise<void>;

  // ========== GESTION DES INDEXATIONS ==========
  getIndexations(): Promise<Indexation[]>;
  getIndexation(id: string): Promise<Indexation | undefined>;
  createIndexation(indexation: InsertIndexation): Promise<Indexation>;
  updateIndexation(
    id: string,
    indexation: Partial<Indexation>
  ): Promise<Indexation | undefined>;
  getContractsEligibleForIndexation(date?: Date): Promise<Contract[]>;

  // ========== GESTION DES PROPOSITIONS D'INDEXATION ==========
  getIndexationProposals(): Promise<IndexationProposal[]>;
  getIndexationProposal(id: string): Promise<IndexationProposal | undefined>;
  createIndexationProposal(
    proposal: InsertIndexationProposal
  ): Promise<IndexationProposal>;
  updateIndexationProposal(
    id: string,
    proposal: Partial<IndexationProposal>
  ): Promise<IndexationProposal | undefined>;
  getIndexationProposalsByStatus(status: string): Promise<IndexationProposal[]>;
  getIndexationProposalsByContractId(
    contractId: string
  ): Promise<IndexationProposal[]>;

  // Deadlines
  getDeadlines(): Promise<Deadline[]>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<void>;
  markAllAlertsAsRead(): Promise<void>;

  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreference[]>;
  createNotificationPreference(
    preference: InsertNotificationPreference
  ): Promise<NotificationPreference>;
  updateNotificationPreferences(
    userId: string,
    preferences: InsertNotificationPreference[]
  ): Promise<void>;

  // Audit Logs
  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Activity Logs
  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Import Logs
  getImportLogs(): Promise<ImportLog[]>;

  // Indexation Formulas
  getIndexationFormulas(): Promise<IndexationFormula[]>;
  getIndexationFormulaById(id: string): Promise<IndexationFormula | undefined>;
  createIndexationFormula(
    formula: InsertIndexationFormula
  ): Promise<IndexationFormula>;
  updateIndexationFormula(
    id: string,
    formula: Partial<InsertIndexationFormula>
  ): Promise<IndexationFormula | undefined>;
  deleteIndexationFormula(id: string): Promise<boolean>;

  // Index Values - Valeurs d'indices économiques
  getIndexValues(): Promise<IndexValue[]>;
  getIndexValue(id: string): Promise<IndexValue | undefined>;
  createIndexValue(value: InsertIndexValue): Promise<IndexValue>;
  updateIndexValue(
    id: string,
    value: Partial<IndexValue>
  ): Promise<IndexValue | undefined>;

  // KPIs
  getKPIs(): Promise<{
    contractsToValidate: number;
    indexationsToValidate: number;
    dueDatesJ30: number;
    dueDatesJ7: number;
    dueDatesJ1: number;
    delayedWorkflows: number;
    pendingTerminations: number;
    amendmentsToValidate: number;
    missingDocuments: number;
    importErrors: number;
  }>;

  // Payment Blocks
  getPaymentBlocks(): Promise<PaymentBlock[]>;
  getPaymentBlock(id: string): Promise<PaymentBlock | undefined>;
  createPaymentBlock(block: InsertPaymentBlock): Promise<PaymentBlock>;
  updatePaymentBlock(
    id: string,
    block: Partial<PaymentBlock>
  ): Promise<PaymentBlock | undefined>;

  // Payment Proofs
  getPaymentProofs(): Promise<PaymentProof[]>;
  getPaymentProof(id: string): Promise<PaymentProof | undefined>;
  createPaymentProof(proof: InsertPaymentProof): Promise<PaymentProof>;
  updatePaymentProof(
    id: string,
    proof: Partial<PaymentProof>
  ): Promise<PaymentProof | undefined>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByContractId(contractId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(
    id: string,
    document: Partial<Document>
  ): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  // Export Jobs
  getExportJobs(): Promise<ExportJob[]>;
  getExportJob(id: string): Promise<ExportJob | undefined>;
  createExportJob(job: InsertExportJob): Promise<ExportJob>;
  updateExportJob(
    id: string,
    job: Partial<ExportJob>
  ): Promise<ExportJob | undefined>;

  // Security Events
  getSecurityEvents(): Promise<SecurityEvent[]>;
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;

  // Reminders
  getReminders(): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(
    id: string,
    reminder: Partial<Reminder>
  ): Promise<Reminder | undefined>;

  // Workflow Definitions
  getWorkflowDefinitions(): Promise<WorkflowDefinition[]>;
  getWorkflowDefinition(id: string): Promise<WorkflowDefinition | undefined>;
  createWorkflowDefinition(
    definition: InsertWorkflowDefinition
  ): Promise<WorkflowDefinition>;
  updateWorkflowDefinition(
    id: string,
    definition: Partial<WorkflowDefinition>
  ): Promise<WorkflowDefinition | undefined>;

  // Workflow Instances
  getWorkflowInstances(): Promise<WorkflowInstance[]>;
  getWorkflowInstance(id: string): Promise<WorkflowInstance | undefined>;
  createWorkflowInstance(
    instance: InsertWorkflowInstance
  ): Promise<WorkflowInstance>;
  updateWorkflowInstance(
    id: string,
    instance: Partial<WorkflowInstance>
  ): Promise<WorkflowInstance | undefined>;

  // Economic Indices INSEE
  upsertEconomicIndex(index: InsertEconomicIndex): Promise<SelectEconomicIndex>;
  getLatestEconomicIndex(
    code: string,
    targetDate: Date
  ): Promise<SelectEconomicIndex | null>;
  getEconomicIndices(filters?: {
    code?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SelectEconomicIndex[]>;

  // Validation Assignments (Affectations de validation)
  getValidationAssignments(): Promise<SelectValidationAssignment[]>;
  getValidationAssignment(
    id: string
  ): Promise<SelectValidationAssignment | undefined>;
  getValidationAssignmentByParkCode(
    parkCode: string
  ): Promise<SelectValidationAssignment | undefined>;
  createValidationAssignment(
    assignment: InsertValidationAssignment
  ): Promise<SelectValidationAssignment>;
  updateValidationAssignment(
    id: string,
    assignment: Partial<InsertValidationAssignment>
  ): Promise<SelectValidationAssignment | undefined>;
  deleteValidationAssignment(id: string): Promise<boolean>;

  // Indexation Frequencies (Fréquences et périmètres d'indexation)
  getIndexationFrequencies(): Promise<SelectIndexationFrequency[]>;
  getIndexationFrequency(
    id: string
  ): Promise<SelectIndexationFrequency | undefined>;
  getIndexationFrequencyByContractCode(
    contractCode: string
  ): Promise<SelectIndexationFrequency | undefined>;
  createIndexationFrequency(
    frequency: InsertIndexationFrequency
  ): Promise<SelectIndexationFrequency>;
  updateIndexationFrequency(
    id: string,
    frequency: Partial<InsertIndexationFrequency>
  ): Promise<SelectIndexationFrequency | undefined>;
  deleteIndexationFrequency(id: string): Promise<boolean>;

  // ========== VALIDATION REQUEST RULES ==========
  findValidationRequestRules(filters?: {
    type?: string;
    isActive?: boolean;
    scopeBusinessUnit?: string;
    scopeContractType?: string;
    scopeParkCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<ValidationRequestsRule[]>;

  getValidationRequestRule(
    id: string
  ): Promise<ValidationRequestsRule | undefined>;
  createValidationRequestRule(
    rule: InsertValidationRequestsRule
  ): Promise<ValidationRequestsRule>;
  updateValidationRequestRule(
    id: string,
    patch: Partial<InsertValidationRequestsRule>
  ): Promise<ValidationRequestsRule | undefined>;
  deleteValidationRequestRule(id: string): Promise<boolean>;

  /**
   * Resolve a single assignee from active rules.
   * Returns { selectedUserId, ruleId } or { selectedUserId: null, ruleId: null } if none match.
   */
  resolveValidationAssignee(ctx: {
    type: string;
    businessUnit?: string;
    contractType?: string;
    parkCode?: string;
    amount?: number;
    asOf?: Date; // default now
  }): Promise<{ selectedUserId: string | null; ruleId: string | null }>;
}

/**
 * Classe principale de gestion du stockage en base de données PostgreSQL
 * Gère toutes les opérations CRUD pour l'application KLYXOR - CLM ENGIE
 * Utilise Drizzle ORM pour l'accès type-safe à la base de données
 */
export class DatabaseStorage implements IStorage {
  /**
   * Récupère un utilisateur par son ID
   * @param id - Identifiant unique de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: string,
    userData: Partial<User>
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  /**
   * Récupère tous les contrats énergétiques ENGIE
   * @returns Liste complète des contrats triés par date de création
   */
  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    return contract || undefined;
  }

  /**
   * Crée un nouveau contrat énergétique
   * @param insertContract - Données du contrat (électricité, gaz, PPA, maintenance)
   * @returns Le contrat créé avec son ID UUID généré
   */
  async createContract(insertContract: InsertContract): Promise<Contract> {
    const [contract] = await db
      .insert(contracts)
      .values({
        ...insertContract,
        updatedAt: new Date(),
      })
      .returning();
    return contract;
  }

  async updateContract(
    id: string,
    updates: Partial<Contract>
  ): Promise<Contract | undefined> {
    const [contract] = await db
      .update(contracts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, id))
      .returning();
    return contract || undefined;
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return true;
  }

  async getAmendments(): Promise<Amendment[]> {
    return await db
      .select()
      .from(amendments)
      .orderBy(desc(amendments.createdAt));
  }

  async getAmendmentsByContractId(contractId: string): Promise<Amendment[]> {
    return await db
      .select()
      .from(amendments)
      .where(eq(amendments.contractId, contractId))
      .orderBy(desc(amendments.createdAt));
  }

  async getAmendment(id: string): Promise<Amendment | undefined> {
    const [amendment] = await db
      .select()
      .from(amendments)
      .where(eq(amendments.id, id));
    return amendment || undefined;
  }

  async createAmendment(insertAmendment: InsertAmendment): Promise<Amendment> {
    const [amendment] = await db
      .insert(amendments)
      .values({
        ...insertAmendment,
        updatedAt: new Date(),
      })
      .returning();
    return amendment;
  }

  async updateAmendment(
    id: string,
    updates: Partial<Amendment>
  ): Promise<Amendment | undefined> {
    const [amendment] = await db
      .update(amendments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(amendments.id, id))
      .returning();
    return amendment || undefined;
  }

  async deleteAmendment(id: string): Promise<boolean> {
    const result = await db.delete(amendments).where(eq(amendments.id, id));
    return true;
  }

  async getTerminations(): Promise<Termination[]> {
    return await db
      .select()
      .from(terminations)
      .orderBy(desc(terminations.createdAt));
  }

  async getTerminationsByContractId(
    contractId: string
  ): Promise<Termination[]> {
    return await db
      .select()
      .from(terminations)
      .where(eq(terminations.contractId, contractId))
      .orderBy(desc(terminations.createdAt));
  }

  async getTermination(id: string): Promise<Termination | undefined> {
    const [termination] = await db
      .select()
      .from(terminations)
      .where(eq(terminations.id, id));
    return termination || undefined;
  }

  async createTermination(
    insertTermination: InsertTermination
  ): Promise<Termination> {
    const [termination] = await db
      .insert(terminations)
      .values({
        ...insertTermination,
        updatedAt: new Date(),
      })
      .returning();
    return termination;
  }

  async updateTermination(
    id: string,
    updates: Partial<Termination>
  ): Promise<Termination | undefined> {
    const [termination] = await db
      .update(terminations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(terminations.id, id))
      .returning();
    return termination || undefined;
  }

  async deleteTermination(id: string): Promise<boolean> {
    const result = await db.delete(terminations).where(eq(terminations.id, id));
    return true;
  }

  async getValidationRequests(): Promise<ValidationRequest[]> {
    return await db
      .select()
      .from(validationRequests)
      .orderBy(desc(validationRequests.createdAt));
  }

  async getValidationRequest(
    id: string
  ): Promise<ValidationRequest | undefined> {
    const [request] = await db
      .select()
      .from(validationRequests)
      .where(eq(validationRequests.id, id));
    return request || undefined;
  }

  async createValidationRequest(
    insertRequest: InsertValidationRequest
  ): Promise<ValidationRequest> {
    const [request] = await db
      .insert(validationRequests)
      .values(insertRequest) // let DB defaults/triggers set created_at/updated_at
      .returning();
    return request;
  }

  async updateValidationRequest(
    id: string,
    updates: Partial<ValidationRequest>
  ): Promise<ValidationRequest | undefined> {
    const [request] = await db
      .update(validationRequests)
      .set(updates) // no manual updatedAt
      .where(eq(validationRequests.id, id))
      .returning();
    return request || undefined;
  }

  /**
   * Récupère toutes les indexations de contrats
   * Inclut les révisions tarifaires selon indices économiques INSEE
   * @returns Liste des indexations triées par date décroissante
   */
  async getIndexations(): Promise<Indexation[]> {
    // Récupérer les vraies données depuis la base de données
    const dbIndexations = await db
      .select()
      .from(indexations)
      .orderBy(desc(indexations.createdAt));

    // Si aucune donnée en base, retourner des données de test pour démonstration
    /*  if (dbIndexations.length === 0) {
      const mockIndexations: Indexation[] = [
        {
          id: "idx-001",
          contractId: "fff46e48-192f-4d58-aebf-817450d6c376",
          contractNumber: "GLB04-2024",
          contractTitle: "Parc Gréoux 1 - Géothermie",
          indexationDate: new Date("2024-10-01"),
          frequency: "Trimestrielle",
          formula: "Type 2.A",
          indexKey: "ICHT/FMOA",
          originalIndexDate: new Date("2023-10-01"),
          revisionIndexDate: new Date("2024-10-01"),
          periodFrom: new Date("2024-07-01"),
          periodTo: new Date("2024-09-30"),
          indices: [
            {
              code: "ICHT",
              valueN1: "128.5",
              valueN: "131.2",
              source: "INSEE",
              date: "2024-10-01",
            },
          ],
          oldAmount: "180000",
          newAmount: "191550",
          previousAmount: "185000",
          proposedAmount: "191550",
          deltaAmount: "6550",
          deltaPercentage: "3.54",
          status: "pending",
          assignedValidator: "Marie Dupont",
          responsible: "Jean Martin",
          businessUnit: "ENGIE Green",
          source: "INSEE",
          validatedBy: null,
          rejectionReason: null,
          createdAt: new Date("2024-10-01"),
          updatedAt: new Date("2024-10-02"),
          validatedAt: null,
        },
        {
          id: "idx-002",
          contractId: "cbff4712-ec93-49db-9d1a-d856ed1aa07a",
          contractNumber: "SCM29-2024",
          contractTitle: "Parc SCAER LE MERDY - Biomasse",
          indexationDate: new Date("2024-09-15"),
          frequency: "Annuelle",
          formula: "Type 1",
          indexKey: "ICHT",
          originalIndexDate: new Date("2023-09-15"),
          revisionIndexDate: new Date("2024-09-15"),
          periodFrom: new Date("2023-09-15"),
          periodTo: new Date("2024-09-14"),
          indices: [
            {
              code: "ICHT",
              valueN1: "125.3",
              valueN: "128.0",
              source: "INSEE",
              date: "2024-09-15",
            },
          ],
          oldAmount: "520000",
          newAmount: "531400",
          previousAmount: "520000",
          proposedAmount: "531400",
          deltaAmount: "11400",
          deltaPercentage: "2.19",
          status: "validated",
          assignedValidator: "Sophie Bernard",
          responsible: "Pierre Leclerc",
          businessUnit: "ENGIE Solutions France",
          source: "INSEE",
          validatedBy: "user-001",
          rejectionReason: null,
          createdAt: new Date("2024-09-15"),
          updatedAt: new Date("2024-09-16"),
          validatedAt: new Date("2024-09-17"),
        },
        {
          id: "idx-003",
          contractId: "42456a9c-9aec-411b-9e51-98023440db47",
          contractNumber: "FIG83-2024",
          contractTitle: "Parc Figanières - Production solaire",
          indexationDate: new Date("2024-11-01"),
          frequency: "Semestrielle",
          formula: "Type 3",
          indexKey: "CPI",
          originalIndexDate: new Date("2024-05-01"),
          revisionIndexDate: new Date("2024-11-01"),
          periodFrom: new Date("2024-05-01"),
          periodTo: new Date("2024-10-31"),
          indices: [
            {
              code: "CPI",
              valueN1: "115.5",
              valueN: "118.1",
              source: "Eurostat",
              date: "2024-11-01",
            },
          ],
          oldAmount: "315000",
          newAmount: "322125",
          previousAmount: "315000",
          proposedAmount: "322125",
          deltaAmount: "7125",
          deltaPercentage: "2.26",
          status: "pending",
          assignedValidator: "Jean Martin",
          responsible: "Marie Dupont",
          businessUnit: "ENGIE Flex",
          source: "Eurostat",
          validatedBy: null,
          rejectionReason: null,
          createdAt: new Date("2024-11-01"),
          updatedAt: new Date("2024-11-01"),
          validatedAt: null,
        },
        {
          id: "idx-004",
          contractId: "0ff277e0-0d10-4738-864b-6e72ffdc757b",
          contractNumber: "AUX89-2024",
          contractTitle: "Parc Auxerrois - Maintenance éolienne",
          indexationDate: new Date("2024-08-01"),
          frequency: "Mensuelle",
          formula: "ICC",
          indexKey: "ICC",
          originalIndexDate: new Date("2024-07-01"),
          revisionIndexDate: new Date("2024-08-01"),
          periodFrom: new Date("2024-07-01"),
          periodTo: new Date("2024-07-31"),
          indices: [
            {
              code: "ICC",
              valueN1: "134.2",
              valueN: "136.9",
              source: "INSEE",
              date: "2024-08-01",
            },
          ],
          oldAmount: "92000",
          newAmount: "93840",
          previousAmount: "92000",
          proposedAmount: "93840",
          deltaAmount: "1840",
          deltaPercentage: "2.0",
          status: "rejected",
          assignedValidator: "Pierre Leclerc",
          responsible: "Sophie Bernard",
          businessUnit: "ENGIE Global Energy Management",
          source: "INSEE",
          validatedBy: null,
          rejectionReason: "Dépassement du plafond contractuel",
          createdAt: new Date("2024-08-01"),
          updatedAt: new Date("2024-08-03"),
          validatedAt: null,
        },
        {
          id: "idx-005",
          contractId: "contract-005",
          contractNumber: "NAN88",
          contractTitle: "Nantes Atlantic Wind",
          indexationDate: new Date("2024-12-01"),
          frequency: "Annuelle",
          formula: "Type 2.B",
          indexKey: "ICHT/FMOA",
          originalIndexDate: new Date("2023-12-01"),
          revisionIndexDate: new Date("2024-12-01"),
          periodFrom: new Date("2023-12-01"),
          periodTo: new Date("2024-11-30"),
          indices: [],
          oldAmount: "675000",
          newAmount: "0",
          previousAmount: "675000",
          proposedAmount: "0",
          deltaAmount: "0",
          deltaPercentage: "0",
          status: "waiting_index",
          assignedValidator: null,
          responsible: "Jean Martin",
          businessUnit: "ENGIE Green",
          source: "INSEE",
          validatedBy: null,
          rejectionReason: null,
          createdAt: new Date("2024-12-01"),
          updatedAt: new Date("2024-12-01"),
          validatedAt: null,
        },
      ];
      return mockIndexations;
    }
 */
    // Retourner les vraies données de la base
    return dbIndexations;
  }

  async getIndexation(id: string): Promise<Indexation | undefined> {
    const [indexation] = await db
      .select()
      .from(indexations)
      .where(eq(indexations.id, id));
    return indexation || undefined;
  }

  async createIndexation(
    insertIndexation: InsertIndexation
  ): Promise<Indexation> {
    const [indexation] = await db
      .insert(indexations)
      .values(insertIndexation)
      .returning();
    return indexation;
  }

  async updateIndexation(
    id: string,
    updates: Partial<Indexation>
  ): Promise<Indexation | undefined> {
    const [indexation] = await db
      .update(indexations)
      .set(updates)
      .where(eq(indexations.id, id))
      .returning();
    return indexation || undefined;
  }

  async getContractsEligibleForIndexation(
    date: Date = new Date()
  ): Promise<Contract[]> {
    // Récupère les contrats actifs avec indexation configurée et date d'indexation proche
    return await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.status, "active"),
          lte(contracts.nextIndexationDate, date)
        )
      )
      .orderBy(contracts.nextIndexationDate);
  }

  async getIndexationProposals(): Promise<IndexationProposal[]> {
    return await db
      .select()
      .from(indexationProposals)
      .orderBy(desc(indexationProposals.createdAt));
  }

  async getIndexationProposal(
    id: string
  ): Promise<IndexationProposal | undefined> {
    const [proposal] = await db
      .select()
      .from(indexationProposals)
      .where(eq(indexationProposals.id, id));
    return proposal || undefined;
  }

  async createIndexationProposal(
    insertProposal: InsertIndexationProposal
  ): Promise<IndexationProposal> {
    const [proposal] = await db
      .insert(indexationProposals)
      .values({
        ...insertProposal,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return proposal;
  }

  async updateIndexationProposal(
    id: string,
    updates: Partial<IndexationProposal>
  ): Promise<IndexationProposal | undefined> {
    const [proposal] = await db
      .update(indexationProposals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(indexationProposals.id, id))
      .returning();
    return proposal || undefined;
  }

  async getIndexationProposalsByStatus(
    status: string
  ): Promise<IndexationProposal[]> {
    return await db
      .select()
      .from(indexationProposals)
      .where(eq(indexationProposals.status, status))
      .orderBy(
        desc(indexationProposals.priority),
        indexationProposals.indexationDate
      );
  }

  async getIndexationProposalsByContractId(
    contractId: string
  ): Promise<IndexationProposal[]> {
    return await db
      .select()
      .from(indexationProposals)
      .where(eq(indexationProposals.contractId, contractId))
      .orderBy(desc(indexationProposals.createdAt));
  }

  async getDeadlines(): Promise<Deadline[]> {
    return await db.select().from(deadlines).orderBy(deadlines.daysRemaining);
  }

  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db.update(alerts).set({ readStatus: true }).where(eq(alerts.id, id));
  }

  async markAllAlertsAsRead(): Promise<void> {
    await db.update(alerts).set({ readStatus: true });
  }

  async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async createNotificationPreference(
    preference: InsertNotificationPreference
  ): Promise<NotificationPreference> {
    const [newPref] = await db
      .insert(notificationPreferences)
      .values(preference)
      .returning();
    return newPref;
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: InsertNotificationPreference[]
  ): Promise<void> {
    // Delete existing preferences
    await db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    // Insert new preferences
    if (preferences.length > 0) {
      await db
        .insert(notificationPreferences)
        .values(preferences.map((pref) => ({ ...pref, userId })));
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(insertLog).returning();
    return log;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.createdAt));
  }

  async createImportLog(log: InsertImportLog): Promise<ImportLog> {
    const [newLog] = await db.insert(importLogs).values(log).returning();
    return newLog;
  }

  async getIndexationFormulas(): Promise<IndexationFormula[]> {
    return await db
      .select()
      .from(indexationFormulas)
      .where(eq(indexationFormulas.isActive, true))
      .orderBy(indexationFormulas.createdAt);
  }

  async getIndexationFormulaById(
    id: string
  ): Promise<IndexationFormula | undefined> {
    const [formula] = await db
      .select()
      .from(indexationFormulas)
      .where(eq(indexationFormulas.id, id));
    return formula || undefined;
  }

  async createIndexationFormula(
    insertFormula: InsertIndexationFormula
  ): Promise<IndexationFormula> {
    const [formula] = await db
      .insert(indexationFormulas)
      .values({
        ...insertFormula,
        updatedAt: new Date(),
      })
      .returning();
    return formula;
  }

  async updateIndexationFormula(
    id: string,
    updates: Partial<InsertIndexationFormula>
  ): Promise<IndexationFormula | undefined> {
    const [formula] = await db
      .update(indexationFormulas)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(indexationFormulas.id, id))
      .returning();
    return formula || undefined;
  }

  async deleteIndexationFormula(id: string): Promise<boolean> {
    const [formula] = await db
      .update(indexationFormulas)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(indexationFormulas.id, id))
      .returning();
    return !!formula;
  }

  // Payment Blocks
  async getPaymentBlocks(): Promise<PaymentBlock[]> {
    return await db
      .select()
      .from(paymentBlocks)
      .orderBy(desc(paymentBlocks.createdAt));
  }

  async getPaymentBlock(id: string): Promise<PaymentBlock | undefined> {
    const [block] = await db
      .select()
      .from(paymentBlocks)
      .where(eq(paymentBlocks.id, id));
    return block || undefined;
  }

  async createPaymentBlock(
    insertBlock: InsertPaymentBlock
  ): Promise<PaymentBlock> {
    const [block] = await db
      .insert(paymentBlocks)
      .values(insertBlock)
      .returning();
    return block;
  }

  async updatePaymentBlock(
    id: string,
    updates: Partial<PaymentBlock>
  ): Promise<PaymentBlock | undefined> {
    const [block] = await db
      .update(paymentBlocks)
      .set(updates)
      .where(eq(paymentBlocks.id, id))
      .returning();
    return block || undefined;
  }

  // Payment Proofs
  async getPaymentProofs(): Promise<PaymentProof[]> {
    return await db
      .select()
      .from(paymentProofs)
      .orderBy(desc(paymentProofs.createdAt));
  }

  async getPaymentProof(id: string): Promise<PaymentProof | undefined> {
    const [proof] = await db
      .select()
      .from(paymentProofs)
      .where(eq(paymentProofs.id, id));
    return proof || undefined;
  }

  async createPaymentProof(
    insertProof: InsertPaymentProof
  ): Promise<PaymentProof> {
    const [proof] = await db
      .insert(paymentProofs)
      .values(insertProof)
      .returning();
    return proof;
  }

  async updatePaymentProof(
    id: string,
    updates: Partial<PaymentProof>
  ): Promise<PaymentProof | undefined> {
    const [proof] = await db
      .update(paymentProofs)
      .set(updates)
      .where(eq(paymentProofs.id, id))
      .returning();
    return proof || undefined;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsByContractId(contractId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.contractId, contractId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(
    id: string,
    updates: Partial<Document>
  ): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const [document] = await db
      .update(documents)
      .set({ status: "deleted" })
      .where(eq(documents.id, id))
      .returning();
    return !!document;
  }

  // Export Jobs
  async getExportJobs(): Promise<ExportJob[]> {
    return await db
      .select()
      .from(exportJobs)
      .orderBy(desc(exportJobs.createdAt));
  }

  async getExportJob(id: string): Promise<ExportJob | undefined> {
    const [job] = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.id, id));
    return job || undefined;
  }

  async createExportJob(insertJob: InsertExportJob): Promise<ExportJob> {
    const [job] = await db.insert(exportJobs).values(insertJob).returning();
    return job;
  }

  async updateExportJob(
    id: string,
    updates: Partial<ExportJob>
  ): Promise<ExportJob | undefined> {
    const [job] = await db
      .update(exportJobs)
      .set(updates)
      .where(eq(exportJobs.id, id))
      .returning();
    return job || undefined;
  }

  // Security Events
  /*  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return await db
      .select()
      .from(securityEvents)
      .orderBy(desc(securityEvents.createdAt));
  } */

  async createSecurityEvent(
    insertEvent: InsertSecurityEvent
  ): Promise<SecurityEvent> {
    const [event] = await db
      .insert(securityEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return await db.select().from(reminders).orderBy(reminders.scheduledDate);
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const [reminder] = await db
      .insert(reminders)
      .values(insertReminder)
      .returning();
    return reminder;
  }

  async updateReminder(
    id: string,
    updates: Partial<Reminder>
  ): Promise<Reminder | undefined> {
    const [reminder] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return reminder || undefined;
  }

  // Workflow Definitions
  async getWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
    return await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.isActive, true));
  }

  async getWorkflowDefinition(
    id: string
  ): Promise<WorkflowDefinition | undefined> {
    const [definition] = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, id));
    return definition || undefined;
  }

  async createWorkflowDefinition(
    insertDefinition: InsertWorkflowDefinition
  ): Promise<WorkflowDefinition> {
    const [definition] = await db
      .insert(workflowDefinitions)
      .values(insertDefinition)
      .returning();
    return definition;
  }

  async updateWorkflowDefinition(
    id: string,
    updates: Partial<WorkflowDefinition>
  ): Promise<WorkflowDefinition | undefined> {
    const [definition] = await db
      .update(workflowDefinitions)
      .set(updates)
      .where(eq(workflowDefinitions.id, id))
      .returning();
    return definition || undefined;
  }

  // Index Values - Valeurs d'indices économiques
  async getIndexValues(): Promise<IndexValue[]> {
    return await db
      .select()
      .from(indexValues)
      .orderBy(desc(indexValues.period));
  }

  async getIndexValue(id: string): Promise<IndexValue | undefined> {
    const [value] = await db
      .select()
      .from(indexValues)
      .where(eq(indexValues.id, id));
    return value || undefined;
  }

  async createIndexValue(insertValue: InsertIndexValue): Promise<IndexValue> {
    const [value] = await db
      .insert(indexValues)
      .values(insertValue)
      .returning();
    return value;
  }

  async updateIndexValue(
    id: string,
    updates: Partial<IndexValue>
  ): Promise<IndexValue | undefined> {
    const [value] = await db
      .update(indexValues)
      .set(updates)
      .where(eq(indexValues.id, id))
      .returning();
    return value || undefined;
  }

  // Economic Indices INSEE
  async upsertEconomicIndex(
    index: InsertEconomicIndex
  ): Promise<SelectEconomicIndex> {
    // Vérifier si l'indice existe déjà pour cette série et cette date
    const existing = await db
      .select()
      .from(economicIndices)
      .where(
        and(
          eq(economicIndices.seriesId, index.seriesId),
          eq(economicIndices.year, index.year),
          eq(economicIndices.month, index.month)
        )
      );

    if (existing.length > 0) {
      // Mise à jour de l'indice existant
      const [updated] = await db
        .update(economicIndices)
        .set({
          ...index,
          updatedAt: new Date(),
        })
        .where(eq(economicIndices.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Création d'un nouvel indice
      const [created] = await db
        .insert(economicIndices)
        .values(index)
        .returning();
      return created;
    }
  }

  async getLatestEconomicIndex(
    code: string,
    targetDate: Date
  ): Promise<SelectEconomicIndex | null> {
    // Récupérer l'indice le plus récent avant ou égal à la date cible
    const indices = await db
      .select()
      .from(economicIndices)
      .where(
        and(
          eq(economicIndices.code, code),
          lte(economicIndices.date, targetDate)
        )
      )
      .orderBy(desc(economicIndices.date))
      .limit(1);

    return indices.length > 0 ? indices[0] : null;
  }

  /**
   * Récupère les indices économiques selon les filtres fournis
   * @param filters - Filtres optionnels : code, startDate, endDate
   * @returns Liste des indices économiques correspondants
   */
  async getEconomicIndices(filters?: {
    code?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SelectEconomicIndex[]> {
    const conditions = [];
    if (filters?.code) {
      conditions.push(eq(economicIndices.code, filters.code));
    }
    if (filters?.startDate) {
      conditions.push(sql`${economicIndices.date} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${economicIndices.date} <= ${filters.endDate}`);
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(economicIndices)
        .where(and(...conditions))
        .orderBy(desc(economicIndices.date));
    }

    return await db
      .select()
      .from(economicIndices)
      .orderBy(desc(economicIndices.date));
  }

  // Workflow Instances
  async getWorkflowInstances(): Promise<WorkflowInstance[]> {
    return await db
      .select()
      .from(workflowInstances)
      .orderBy(desc(workflowInstances.createdAt));
  }

  async getWorkflowInstance(id: string): Promise<WorkflowInstance | undefined> {
    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.id, id));
    return instance || undefined;
  }

  async createWorkflowInstance(
    insertInstance: InsertWorkflowInstance
  ): Promise<WorkflowInstance> {
    const [instance] = await db
      .insert(workflowInstances)
      .values(insertInstance)
      .returning();
    return instance;
  }

  async updateWorkflowInstance(
    id: string,
    updates: Partial<WorkflowInstance>
  ): Promise<WorkflowInstance | undefined> {
    const [instance] = await db
      .update(workflowInstances)
      .set(updates)
      .where(eq(workflowInstances.id, id))
      .returning();
    return instance || undefined;
  }

  // Validation Assignments methods
  async getValidationAssignments(): Promise<SelectValidationAssignment[]> {
    return await db
      .select()
      .from(validationAssignments)
      .orderBy(validationAssignments.parkCode);
  }

  async getValidationAssignment(
    id: string
  ): Promise<SelectValidationAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(validationAssignments)
      .where(eq(validationAssignments.id, id));
    return assignment || undefined;
  }

  async getValidationAssignmentByParkCode(
    parkCode: string
  ): Promise<SelectValidationAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(validationAssignments)
      .where(eq(validationAssignments.parkCode, parkCode));
    return assignment || undefined;
  }

  async createValidationAssignment(
    insertAssignment: InsertValidationAssignment
  ): Promise<SelectValidationAssignment> {
    const [assignment] = await db
      .insert(validationAssignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async updateValidationAssignment(
    id: string,
    updates: Partial<InsertValidationAssignment>
  ): Promise<SelectValidationAssignment | undefined> {
    const [assignment] = await db
      .update(validationAssignments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(validationAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async deleteValidationAssignment(id: string): Promise<boolean> {
    const assignment = await this.getValidationAssignment(id);
    if (assignment) {
      await db
        .delete(validationAssignments)
        .where(eq(validationAssignments.id, id));
      return true;
    }
    return false;
  }

  // ========== GESTION DES FRÉQUENCES D'INDEXATION ==========

  /**
   * Récupère toutes les fréquences d'indexation configurées dans le système
   * @returns {Promise<SelectIndexationFrequency[]>} Liste des fréquences triées par code contrat
   * @description Retourne la configuration complète des fréquences d'indexation pour chaque contrat,
   * incluant la fréquence (mensuelle, trimestrielle, annuelle) et le périmètre d'application
   */
  async getIndexationFrequencies(): Promise<SelectIndexationFrequency[]> {
    return await db
      .select()
      .from(indexationFrequencies)
      .orderBy(indexationFrequencies.contractCode);
  }

  /**
   * Récupère une fréquence d'indexation spécifique par son identifiant
   * @param {string} id - Identifiant unique de la fréquence
   * @returns {Promise<SelectIndexationFrequency | undefined>} La fréquence trouvée ou undefined
   * @description Utilisé pour obtenir les détails d'une configuration de fréquence particulière
   */
  async getIndexationFrequency(
    id: string
  ): Promise<SelectIndexationFrequency | undefined> {
    const [frequency] = await db
      .select()
      .from(indexationFrequencies)
      .where(eq(indexationFrequencies.id, id));
    return frequency || undefined;
  }

  /**
   * Recherche une fréquence d'indexation par code contrat
   * @param {string} contractCode - Code du contrat (ex: AUX89, FIG83)
   * @returns {Promise<SelectIndexationFrequency | undefined>} La configuration de fréquence associée au contrat
   * @description Permet de trouver rapidement la configuration d'indexation d'un contrat spécifique
   */
  async getIndexationFrequencyByContractCode(
    contractCode: string
  ): Promise<SelectIndexationFrequency | undefined> {
    const [frequency] = await db
      .select()
      .from(indexationFrequencies)
      .where(eq(indexationFrequencies.contractCode, contractCode));
    return frequency || undefined;
  }

  /**
   * Crée une nouvelle configuration de fréquence d'indexation
   * @param {InsertIndexationFrequency} insertFrequency - Données de la nouvelle fréquence
   * @returns {Promise<SelectIndexationFrequency>} La fréquence créée avec son ID généré
   * @description Ajoute une nouvelle configuration pour gérer l'indexation automatique d'un contrat
   */
  async createIndexationFrequency(
    insertFrequency: InsertIndexationFrequency
  ): Promise<SelectIndexationFrequency> {
    const [frequency] = await db
      .insert(indexationFrequencies)
      .values(insertFrequency)
      .returning();
    return frequency;
  }

  /**
   * Met à jour une configuration de fréquence d'indexation existante
   * @param {string} id - Identifiant de la fréquence à modifier
   * @param {Partial<InsertIndexationFrequency>} updates - Modifications à appliquer
   * @returns {Promise<SelectIndexationFrequency | undefined>} La fréquence mise à jour ou undefined si non trouvée
   * @description Permet de modifier la fréquence ou le périmètre d'indexation d'un contrat
   */
  async updateIndexationFrequency(
    id: string,
    updates: Partial<InsertIndexationFrequency>
  ): Promise<SelectIndexationFrequency | undefined> {
    const [frequency] = await db
      .update(indexationFrequencies)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(indexationFrequencies.id, id))
      .returning();
    return frequency || undefined;
  }

  /**
   * Supprime une configuration de fréquence d'indexation
   * @param {string} id - Identifiant de la fréquence à supprimer
   * @returns {Promise<boolean>} true si supprimée, false si non trouvée
   * @description Retire définitivement une configuration d'indexation du système
   */
  async deleteIndexationFrequency(id: string): Promise<boolean> {
    const frequency = await this.getIndexationFrequency(id);
    if (frequency) {
      await db
        .delete(indexationFrequencies)
        .where(eq(indexationFrequencies.id, id));
      return true;
    }
    return false;
  }

  async getKPIs(): Promise<{
    contractsToValidate: number;
    indexationsToValidate: number;
    dueDatesJ30: number;
    dueDatesJ7: number;
    dueDatesJ1: number;
    delayedWorkflows: number;
    pendingTerminations: number;
    amendmentsToValidate: number;
    missingDocuments: number;
    importErrors: number;
  }> {
    const validationRequestsPromise = this.getValidationRequests();
    const contractsPromise = this.getContracts();
    const deadlinesPromise = this.getDeadlines();
    const importLogsPromise = this.getImportLogs();

    const [
      validationRequestsData,
      contractsData,
      deadlinesData,
      importLogsData,
    ] = await Promise.all([
      validationRequestsPromise,
      contractsPromise,
      deadlinesPromise,
      importLogsPromise,
    ]);

    return {
      contractsToValidate: validationRequestsData.filter(
        (r) => r.type === "contract" && r.status === "pending"
      ).length,
      indexationsToValidate: validationRequestsData.filter(
        (r) => r.type === "indexation" && r.status === "pending"
      ).length,
      dueDatesJ30: deadlinesData.filter(
        (d) => d.daysRemaining <= 30 && d.daysRemaining > 7
      ).length,
      dueDatesJ7: deadlinesData.filter(
        (d) => d.daysRemaining <= 7 && d.daysRemaining > 1
      ).length,
      dueDatesJ1: deadlinesData.filter((d) => d.daysRemaining <= 1).length,
      delayedWorkflows: validationRequestsData.filter((r) => r.age > 1).length,
      pendingTerminations: validationRequestsData.filter(
        (r) => r.type === "termination" && r.status === "pending"
      ).length,
      amendmentsToValidate: validationRequestsData.filter(
        (r) => r.type === "amendment" && r.status === "pending"
      ).length,
      missingDocuments: contractsData.filter((c) => !c.hasRequiredDocuments)
        .length,
      importErrors: importLogsData.filter((l) => l.status === "error").length,
    };
  }

  // 1) findValidationRequests
  async findValidationRequests(filters?: {
    status?: ValidationRequest["status"][];
    type?: string;
    assignedTo?: string;
    requestedBy?: string;
    referenceId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ValidationRequest[]> {
    const {
      status,
      type,
      assignedTo,
      requestedBy,
      referenceId,
      search,
      limit = 50,
      offset = 0,
    } = filters ?? {};

    // Build simple AND filters (portable)
    const clauses: any[] = [];
    if (status?.length)
      clauses.push(sql`${validationRequests.status} = ANY(${status})`);
    if (type) clauses.push(eq(validationRequests.type, type));
    if (assignedTo) clauses.push(eq(validationRequests.assignedTo, assignedTo));
    if (requestedBy)
      clauses.push(eq(validationRequests.requestedBy, requestedBy));
    if (referenceId)
      clauses.push(eq(validationRequests.referenceId, referenceId));

    const base = db
      .select()
      .from(validationRequests)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(validationRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const rows = await base;

    // simple in-memory search on subject/reference (keeps code DB-agnostic)
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.subject ?? "").toLowerCase().includes(q) ||
        (r.reference ?? "").toLowerCase().includes(q)
    );
  }

  // 2) bulkUpdateValidationRequests
  async bulkUpdateValidationRequests(
    ids: string[],
    patch: Partial<ValidationRequest>
  ): Promise<ValidationRequest[]> {
    if (!ids.length) return [];
    const res = await db
      .update(validationRequests)
      .set(patch)
      .where(sql`${validationRequests.id} = ANY(${ids})`)
      .returning();
    return res;
  }

  // 3) incrementAgesForPending
  async incrementAgesForPending(): Promise<void> {
    await db.execute(sql`
    UPDATE ${validationRequests}
    SET age = age + 1
    WHERE status = 'pending'
  `);
  }

  /**
   * Récupère les événements de sécurité depuis la base de données
   * @param {number} limit - Nombre maximum d'événements à récupérer
   * @param {string} eventType - Type d'événement à filtrer (optionnel)
   * @returns {Promise<Array>} Liste des événements de sécurité
   */
  async getSecurityEvents(
    limit: number = 100,
    eventType?: string
  ): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(securityEvents)
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      /*  if (eventType) {
        query = query.where(eq(securityEvents.eventType, eventType));
      } */

      const events = await query;
      return events || [];
    } catch (error) {
      console.error("Error fetching security events:", error);
      return [];
    }
  }

  // ========== GESTION DES SNIPPETS DE CODE ==========

  async getCodeSnippets(userId?: string): Promise<CodeSnippet[]> {
    if (userId) {
      // Get snippets created by user or shared with them or public
      return await db
        .select()
        .from(codeSnippets)
        .where(
          sql`${codeSnippets.createdBy} = ${userId} OR 
              ${codeSnippets.isPublic} = true OR 
              ${userId} = ANY(${codeSnippets.sharedWith})`
        )
        .orderBy(desc(codeSnippets.createdAt));
    } else {
      // Only public snippets if no user
      return await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.isPublic, true))
        .orderBy(desc(codeSnippets.createdAt));
    }
  }

  async getCodeSnippet(id: string): Promise<CodeSnippet | undefined> {
    const [snippet] = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.id, id));
    return snippet;
  }

  async getCodeSnippetsByContext(
    context: string,
    contextId?: string
  ): Promise<CodeSnippet[]> {
    if (contextId) {
      return await db
        .select()
        .from(codeSnippets)
        .where(
          and(
            eq(codeSnippets.context, context),
            eq(codeSnippets.contextId, contextId)
          )
        )
        .orderBy(desc(codeSnippets.createdAt));
    } else {
      return await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.context, context))
        .orderBy(desc(codeSnippets.createdAt));
    }
  }

  async createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet> {
    const [newSnippet] = await db
      .insert(codeSnippets)
      .values(snippet)
      .returning();
    return newSnippet;
  }

  async updateCodeSnippet(
    id: string,
    snippet: Partial<CodeSnippet>
  ): Promise<CodeSnippet | undefined> {
    const [updated] = await db
      .update(codeSnippets)
      .set({ ...snippet, updatedAt: new Date() })
      .where(eq(codeSnippets.id, id))
      .returning();
    return updated;
  }

  async deleteCodeSnippet(id: string): Promise<boolean> {
    const result = await db.delete(codeSnippets).where(eq(codeSnippets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementSnippetViewCount(id: string): Promise<void> {
    await db
      .update(codeSnippets)
      .set({ viewCount: sql`${codeSnippets.viewCount} + 1` })
      .where(eq(codeSnippets.id, id));
  }

  async incrementSnippetCopyCount(id: string): Promise<void> {
    await db
      .update(codeSnippets)
      .set({ copyCount: sql`${codeSnippets.copyCount} + 1` })
      .where(eq(codeSnippets.id, id));
  }

  // ========== VALIDATION REQUEST RULES (CRUD) ==========

  async findValidationRequestRules(filters?: {
    type?: string;
    isActive?: boolean;
    scopeBusinessUnit?: string;
    scopeContractType?: string;
    scopeParkCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<ValidationRequestsRule[]> {
    const {
      type,
      isActive,
      scopeBusinessUnit,
      scopeContractType,
      scopeParkCode,
      limit = 50,
      offset = 0,
    } = filters ?? {};

    const clauses: any[] = [];
    if (type) clauses.push(eq(validationRequestsRules.type, type));
    if (typeof isActive === "boolean")
      clauses.push(eq(validationRequestsRules.isActive, isActive));
    if (scopeBusinessUnit)
      clauses.push(
        eq(validationRequestsRules.scopeBusinessUnit, scopeBusinessUnit)
      );
    if (scopeContractType)
      clauses.push(
        eq(validationRequestsRules.scopeContractType, scopeContractType)
      );
    if (scopeParkCode)
      clauses.push(eq(validationRequestsRules.scopeParkCode, scopeParkCode));

    const rows = await db
      .select()
      .from(validationRequestsRules)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(validationRequestsRules.priority) // lower first
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async getValidationRequestRule(
    id: string
  ): Promise<ValidationRequestsRule | undefined> {
    const [rule] = await db
      .select()
      .from(validationRequestsRules)
      .where(eq(validationRequestsRules.id, id));
    return rule || undefined;
  }

  async createValidationRequestRule(
    rule: InsertValidationRequestsRule
  ): Promise<ValidationRequestsRule> {
    const [created] = await db
      .insert(validationRequestsRules)
      .values({
        ...rule,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateValidationRequestRule(
    id: string,
    patch: Partial<InsertValidationRequestsRule>
  ): Promise<ValidationRequestsRule | undefined> {
    const [updated] = await db
      .update(validationRequestsRules)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(validationRequestsRules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteValidationRequestRule(id: string): Promise<boolean> {
    const res = await db
      .delete(validationRequestsRules)
      .where(eq(validationRequestsRules.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // ========== VALIDATION RULES RESOLVER ==========

  async resolveValidationAssignee(ctx: {
    type: string;
    businessUnit?: string;
    contractType?: string;
    parkCode?: string;
    amount?: number;
    asOf?: Date;
  }): Promise<{ selectedUserId: string | null; ruleId: string | null }> {
    const now = ctx.asOf ?? new Date();

    // Step 1: pre-filter by type, active, and validity window
    const baseClauses: any[] = [
      eq(validationRequestsRules.type, ctx.type),
      eq(validationRequestsRules.isActive, true),
      // (validFrom is null OR validFrom <= now)
      sql`(${validationRequestsRules.validFrom} IS NULL OR ${validationRequestsRules.validFrom} <= ${now})`,
      // (validUntil is null OR validUntil >= now)
      sql`(${validationRequestsRules.validUntil} IS NULL OR ${validationRequestsRules.validUntil} >= ${now})`,
    ];

    // Step 2: fetch candidates ordered by priority (lower = better), then createdAt asc
    const candidates = await db
      .select()
      .from(validationRequestsRules)
      .where(and(...baseClauses))
      .orderBy(
        validationRequestsRules.priority,
        validationRequestsRules.createdAt
      );

    if (!candidates.length) {
      return { selectedUserId: null, ruleId: null };
    }

    // Step 3: in-memory matching with "null = wildcard" semantics and amount range
    const matches = candidates.filter((r) => {
      // scope wildcard logic
      const buOk =
        !r.scopeBusinessUnit || r.scopeBusinessUnit === ctx.businessUnit;
      const ctOk =
        !r.scopeContractType || r.scopeContractType === ctx.contractType;
      const parkOk = !r.scopeParkCode || r.scopeParkCode === ctx.parkCode;

      // amount window (inclusive), null means unbounded
      const amt = ctx.amount;
      const minOk =
        r.amountMin == null ||
        (amt != null && Number(amt) >= Number(r.amountMin));
      const maxOk =
        r.amountMax == null ||
        (amt != null && Number(amt) <= Number(r.amountMax));

      return buOk && ctOk && parkOk && minOk && maxOk;
    });

    if (!matches.length) {
      return { selectedUserId: null, ruleId: null };
    }

    // Step 4: pick the first (best priority, earliest create)
    const best = matches[0];
    return {
      selectedUserId: best.selectedUserId ?? null,
      ruleId: best.id ?? null,
    };
  }
}

export const storage = new DatabaseStorage();
