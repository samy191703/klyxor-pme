import {
  users,
  contracts,
  validationRequests,
  indexations,
  indexationFormulas,
  deadlines,
  alerts,
  activityLogs,
  importLogs,
  amendments,
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
  type Deadline,
  type InsertDeadline,
  type Alert,
  type InsertAlert,
  type ActivityLog,
  type InsertActivityLog,
  type ImportLog,
  type InsertImportLog,
  type Amendment,
  type InsertAmendment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, gt, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<Contract>): Promise<Contract | undefined>;
  
  // Amendments
  getAmendments(): Promise<Amendment[]>;
  getAmendmentsByContractId(contractId: string): Promise<Amendment[]>;
  getAmendment(id: string): Promise<Amendment | undefined>;
  createAmendment(amendment: InsertAmendment): Promise<Amendment>;
  updateAmendment(id: string, amendment: Partial<Amendment>): Promise<Amendment | undefined>;
  deleteAmendment(id: string): Promise<boolean>;

  // Validation Requests
  getValidationRequests(): Promise<ValidationRequest[]>;
  getValidationRequest(id: string): Promise<ValidationRequest | undefined>;
  createValidationRequest(request: InsertValidationRequest): Promise<ValidationRequest>;
  updateValidationRequest(id: string, request: Partial<ValidationRequest>): Promise<ValidationRequest | undefined>;

  // Indexations
  getIndexations(): Promise<Indexation[]>;
  getIndexation(id: string): Promise<Indexation | undefined>;
  createIndexation(indexation: InsertIndexation): Promise<Indexation>;
  updateIndexation(id: string, indexation: Partial<Indexation>): Promise<Indexation | undefined>;

  // Deadlines
  getDeadlines(): Promise<Deadline[]>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  markAlertAsRead(id: string): Promise<void>;
  markAllAlertsAsRead(): Promise<void>;

  // Activity Logs
  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Import Logs
  getImportLogs(): Promise<ImportLog[]>;

  // Indexation Formulas
  getIndexationFormulas(): Promise<IndexationFormula[]>;
  getIndexationFormulaById(id: string): Promise<IndexationFormula | undefined>;
  createIndexationFormula(formula: InsertIndexationFormula): Promise<IndexationFormula>;
  updateIndexationFormula(id: string, formula: Partial<InsertIndexationFormula>): Promise<IndexationFormula | undefined>;
  deleteIndexationFormula(id: string): Promise<boolean>;

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

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

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined> {
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

  async getAmendments(): Promise<Amendment[]> {
    return await db.select().from(amendments).orderBy(desc(amendments.createdAt));
  }

  async getAmendmentsByContractId(contractId: string): Promise<Amendment[]> {
    return await db.select().from(amendments).where(eq(amendments.contractId, contractId)).orderBy(desc(amendments.createdAt));
  }

  async getAmendment(id: string): Promise<Amendment | undefined> {
    const [amendment] = await db.select().from(amendments).where(eq(amendments.id, id));
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

  async updateAmendment(id: string, updates: Partial<Amendment>): Promise<Amendment | undefined> {
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

  async getValidationRequests(): Promise<ValidationRequest[]> {
    return await db.select().from(validationRequests).orderBy(desc(validationRequests.createdAt));
  }

  async getValidationRequest(id: string): Promise<ValidationRequest | undefined> {
    const [request] = await db.select().from(validationRequests).where(eq(validationRequests.id, id));
    return request || undefined;
  }

  async createValidationRequest(insertRequest: InsertValidationRequest): Promise<ValidationRequest> {
    const [request] = await db
      .insert(validationRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async updateValidationRequest(id: string, updates: Partial<ValidationRequest>): Promise<ValidationRequest | undefined> {
    const [request] = await db
      .update(validationRequests)
      .set(updates)
      .where(eq(validationRequests.id, id))
      .returning();
    return request || undefined;
  }

  async getIndexations(): Promise<Indexation[]> {
    // Données de test en cours pour l'onglet "En cours"
    const mockIndexations: Indexation[] = [
      {
        id: "idx-001",
        contractId: "contract-001",
        contractNumber: "TEG55",
        contractTitle: "Tour Eiffel Green - Production solaire",
        indexationDate: new Date("2024-10-01"),
        frequency: "Trimestrielle",
        formula: "Type 2.A",
        indexKey: "ICHT/FMOA",
        originalIndexDate: new Date("2023-10-01"),
        revisionIndexDate: new Date("2024-10-01"),
        periodFrom: new Date("2024-07-01"),
        periodTo: new Date("2024-09-30"),
        indices: [{code: "ICHT", valueN1: "128.5", valueN: "131.2", source: "INSEE", date: "2024-10-01"}],
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
        validatedAt: null
      },
      {
        id: "idx-002",
        contractId: "contract-002",
        contractNumber: "MRS14",
        contractTitle: "Marseille Renewable Services",
        indexationDate: new Date("2024-09-15"),
        frequency: "Annuelle",
        formula: "Type 1",
        indexKey: "ICHT",
        originalIndexDate: new Date("2023-09-15"),
        revisionIndexDate: new Date("2024-09-15"),
        periodFrom: new Date("2023-09-15"),
        periodTo: new Date("2024-09-14"),
        indices: [{code: "ICHT", valueN1: "125.3", valueN: "128.0", source: "INSEE", date: "2024-09-15"}],
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
        validatedAt: new Date("2024-09-17")
      },
      {
        id: "idx-003",
        contractId: "contract-003",
        contractNumber: "LYN42",
        contractTitle: "Lyon Nord Énergie - Maintenance",
        indexationDate: new Date("2024-11-01"),
        frequency: "Semestrielle",
        formula: "Type 3",
        indexKey: "CPI",
        originalIndexDate: new Date("2024-05-01"),
        revisionIndexDate: new Date("2024-11-01"),
        periodFrom: new Date("2024-05-01"),
        periodTo: new Date("2024-10-31"),
        indices: [{code: "CPI", valueN1: "115.5", valueN: "118.1", source: "Eurostat", date: "2024-11-01"}],
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
        validatedAt: null
      },
      {
        id: "idx-004",
        contractId: "contract-004",
        contractNumber: "BRD09",
        contractTitle: "Bordeaux Renewable District",
        indexationDate: new Date("2024-08-01"),
        frequency: "Mensuelle",
        formula: "ICC",
        indexKey: "ICC",
        originalIndexDate: new Date("2024-07-01"),
        revisionIndexDate: new Date("2024-08-01"),
        periodFrom: new Date("2024-07-01"),
        periodTo: new Date("2024-07-31"),
        indices: [{code: "ICC", valueN1: "134.2", valueN: "136.9", source: "INSEE", date: "2024-08-01"}],
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
        validatedAt: null
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
        validatedAt: null
      }
    ];
    
    return mockIndexations;
  }

  async getIndexation(id: string): Promise<Indexation | undefined> {
    const [indexation] = await db.select().from(indexations).where(eq(indexations.id, id));
    return indexation || undefined;
  }

  async createIndexation(insertIndexation: InsertIndexation): Promise<Indexation> {
    const [indexation] = await db
      .insert(indexations)
      .values(insertIndexation)
      .returning();
    return indexation;
  }

  async updateIndexation(id: string, updates: Partial<Indexation>): Promise<Indexation | undefined> {
    const [indexation] = await db
      .update(indexations)
      .set(updates)
      .where(eq(indexations.id, id))
      .returning();
    return indexation || undefined;
  }

  async getDeadlines(): Promise<Deadline[]> {
    return await db.select().from(deadlines).orderBy(deadlines.daysRemaining);
  }

  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id));
  }

  async markAllAlertsAsRead(): Promise<void> {
    await db
      .update(alerts)
      .set({ isRead: true });
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return await db.select().from(importLogs).orderBy(desc(importLogs.createdAt));
  }

  async getIndexationFormulas(): Promise<IndexationFormula[]> {
    return await db.select().from(indexationFormulas).where(eq(indexationFormulas.isActive, true)).orderBy(desc(indexationFormulas.createdAt));
  }

  async getIndexationFormulaById(id: string): Promise<IndexationFormula | undefined> {
    const [formula] = await db.select().from(indexationFormulas).where(eq(indexationFormulas.id, id));
    return formula || undefined;
  }

  async createIndexationFormula(insertFormula: InsertIndexationFormula): Promise<IndexationFormula> {
    const [formula] = await db
      .insert(indexationFormulas)
      .values({
        ...insertFormula,
        updatedAt: new Date(),
      })
      .returning();
    return formula;
  }

  async updateIndexationFormula(id: string, updates: Partial<InsertIndexationFormula>): Promise<IndexationFormula | undefined> {
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

    const [validationRequestsData, contractsData, deadlinesData, importLogsData] = await Promise.all([
      validationRequestsPromise,
      contractsPromise,
      deadlinesPromise,
      importLogsPromise,
    ]);

    return {
      contractsToValidate: validationRequestsData.filter(r => r.type === "contract" && r.status === "pending").length,
      indexationsToValidate: validationRequestsData.filter(r => r.type === "indexation" && r.status === "pending").length,
      dueDatesJ30: deadlinesData.filter(d => d.daysRemaining <= 30 && d.daysRemaining > 7).length,
      dueDatesJ7: deadlinesData.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 1).length,
      dueDatesJ1: deadlinesData.filter(d => d.daysRemaining <= 1).length,
      delayedWorkflows: validationRequestsData.filter(r => r.age > 1).length,
      pendingTerminations: validationRequestsData.filter(r => r.type === "termination" && r.status === "pending").length,
      amendmentsToValidate: validationRequestsData.filter(r => r.type === "amendment" && r.status === "pending").length,
      missingDocuments: contractsData.filter(c => !c.hasRequiredDocuments).length,
      importErrors: importLogsData.filter(l => l.status === "error").length,
    };
  }
}

export const storage = new DatabaseStorage();