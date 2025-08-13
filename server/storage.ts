import {
  type User,
  type InsertUser,
  type Contract,
  type InsertContract,
  type ValidationRequest,
  type InsertValidationRequest,
  type Indexation,
  type InsertIndexation,
  type Deadline,
  type InsertDeadline,
  type Alert,
  type InsertAlert,
  type ActivityLog,
  type InsertActivityLog,
  type ImportLog,
  type InsertImportLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contracts: Map<string, Contract>;
  private validationRequests: Map<string, ValidationRequest>;
  private indexations: Map<string, Indexation>;
  private deadlines: Map<string, Deadline>;
  private alerts: Map<string, Alert>;
  private activityLogs: Map<string, ActivityLog>;
  private importLogs: Map<string, ImportLog>;

  constructor() {
    this.users = new Map();
    this.contracts = new Map();
    this.validationRequests = new Map();
    this.indexations = new Map();
    this.deadlines = new Map();
    this.alerts = new Map();
    this.activityLogs = new Map();
    this.importLogs = new Map();

    this.seedData();
  }

  private seedData() {
    // Seed admin user
    const adminUser: User = {
      id: "admin-1",
      username: "admin",
      password: "admin",
      name: "Admin User",
      role: "admin",
      email: "admin@clm.com",
    };
    this.users.set(adminUser.id, adminUser);

    // Seed some contracts
    const contracts: Contract[] = [
      {
        id: "cnt-1",
        number: "CNT-2024-001",
        title: "Contrat de prestation informatique",
        status: "pending_validation",
        type: "Service",
        businessUnit: "IT Services",
        amount: "250000.00",
        currency: "EUR",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-12-31"),
        indexationFrequency: "annual",
        nextIndexationDate: new Date("2024-12-01"),
        createdBy: "user-1",
        validatedBy: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        hasRequiredDocuments: false,
      },
      {
        id: "cnt-2",
        number: "CNT-2023-045",
        title: "Contrat de maintenance",
        status: "active",
        type: "Maintenance",
        businessUnit: "IT Services",
        amount: "120000.00",
        currency: "EUR",
        startDate: new Date("2023-02-01"),
        endDate: new Date("2024-02-15"),
        indexationFrequency: "quarterly",
        nextIndexationDate: new Date("2024-02-01"),
        createdBy: "user-2",
        validatedBy: "admin-1",
        createdAt: new Date("2023-01-20"),
        updatedAt: new Date("2023-02-01"),
        hasRequiredDocuments: true,
      },
    ];

    contracts.forEach(contract => this.contracts.set(contract.id, contract));

    // Seed validation requests
    const validationRequests: ValidationRequest[] = [
      {
        id: "val-1",
        type: "contract",
        referenceId: "cnt-1",
        reference: "CNT-2024-001",
        subject: "Contrat de prestation informatique",
        requestedBy: "user-1",
        assignedTo: "admin-1",
        status: "pending",
        reason: null,
        createdAt: new Date("2024-01-15"),
        age: 3,
      },
      {
        id: "val-2",
        type: "indexation",
        referenceId: "idx-1",
        reference: "IDX-2024-012",
        subject: "Indexation automatique Q1 2024",
        requestedBy: "system",
        assignedTo: "admin-1",
        status: "pending",
        reason: null,
        createdAt: new Date("2024-02-07"),
        age: 1,
      },
    ];

    validationRequests.forEach(req => this.validationRequests.set(req.id, req));

    // Seed indexations
    const indexations: Indexation[] = [
      {
        id: "idx-1",
        contractId: "cnt-2",
        contractNumber: "CNT-2024-002",
        contractTitle: "Maintenance informatique",
        indexationDate: new Date("2024-01-01"),
        frequency: "Annuelle",
        formula: "ICC",
        indexKey: "BT01",
        source: "INSEE",
        businessUnit: "IT Services",
        responsible: "Marie Dupont",
        periodFrom: new Date("2023-01-01"),
        periodTo: new Date("2023-12-31"),
        originalIndexDate: new Date("2023-01-01"),
        revisionIndexDate: new Date("2024-01-01"),
        indices: [
          {
            code: "BT01",
            valueN1: 108.5,
            valueN: 110.2,
            source: "INSEE",
            date: "2024-01-15"
          }
        ],
        oldAmount: "120000.00",
        newAmount: "121880.00",
        previousAmount: "120000.00",
        proposedAmount: "121880.00",
        deltaAmount: "1880.00",
        deltaPercentage: "1.57",
        status: "pending",
        assignedValidator: "Jean Martin",
        validatedBy: null,
        validatedAt: null,
        rejectionReason: null,
        createdAt: new Date("2024-02-07"),
        updatedAt: new Date("2024-02-07"),
      },
      {
        id: "idx-2",
        contractId: "cnt-3",
        contractNumber: "CNT-2024-003",
        contractTitle: "Location bureaux",
        indexationDate: new Date("2024-02-01"),
        frequency: "Trimestrielle",
        formula: "ILC",
        indexKey: "ILC",
        source: "INSEE",
        businessUnit: "BU France",
        responsible: "Sophie Bernard",
        periodFrom: new Date("2023-11-01"),
        periodTo: new Date("2024-01-31"),
        originalIndexDate: new Date("2023-02-01"),
        revisionIndexDate: new Date("2024-02-01"),
        indices: [
          {
            code: "ILC",
            valueN1: 125.3,
            valueN: 128.7,
            source: "INSEE",
            date: "2024-02-01"
          }
        ],
        oldAmount: "50000.00",
        newAmount: "51355.00",
        previousAmount: "50000.00",
        proposedAmount: "51355.00",
        deltaAmount: "1355.00",
        deltaPercentage: "2.71",
        status: "validated",
        assignedValidator: "Jean Martin",
        validatedBy: "Jean Martin",
        validatedAt: new Date("2024-02-08"),
        rejectionReason: null,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-08"),
      },
      {
        id: "idx-3",
        contractId: "cnt-4",
        contractNumber: "CNT-2024-004",
        contractTitle: "Services de nettoyage",
        indexationDate: new Date("2024-03-01"),
        frequency: "Annuelle",
        formula: "IRL",
        indexKey: "IRL",
        source: "INSEE",
        businessUnit: "BU Services",
        responsible: null,
        periodFrom: new Date("2023-03-01"),
        periodTo: new Date("2024-02-29"),
        originalIndexDate: new Date("2023-03-01"),
        revisionIndexDate: new Date("2024-03-01"),
        indices: [
          {
            code: "IRL",
            valueN1: 138.9,
            valueN: 142.1,
            source: "INSEE",
            date: "2024-03-01"
          }
        ],
        oldAmount: "25000.00",
        newAmount: "25576.00",
        previousAmount: "25000.00",
        proposedAmount: "25576.00",
        deltaAmount: "576.00",
        deltaPercentage: "2.30",
        status: "to_calculate",
        assignedValidator: null,
        validatedBy: null,
        validatedAt: null,
        rejectionReason: null,
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date("2024-03-01"),
      },
      {
        id: "idx-4",
        contractId: "cnt-5",
        contractNumber: "CNT-2024-005",
        contractTitle: "Fournitures de bureau",
        indexationDate: new Date("2024-01-15"),
        frequency: "Semestrielle",
        formula: "FM0A",
        indexKey: "FM0A",
        source: "Banque de France",
        businessUnit: "BU International",
        responsible: "Marie Dupont",
        periodFrom: new Date("2023-07-01"),
        periodTo: new Date("2023-12-31"),
        originalIndexDate: new Date("2023-07-01"),
        revisionIndexDate: new Date("2024-01-15"),
        indices: null,
        oldAmount: "15000.00",
        newAmount: "15000.00",
        previousAmount: "15000.00",
        proposedAmount: null,
        deltaAmount: "0.00",
        deltaPercentage: "0.00",
        status: "waiting_index",
        assignedValidator: null,
        validatedBy: null,
        validatedAt: null,
        rejectionReason: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
      {
        id: "idx-5",
        contractId: "cnt-6",
        contractNumber: "CNT-2024-006",
        contractTitle: "Transport logistique",
        indexationDate: new Date("2024-02-10"),
        frequency: "Annuelle",
        formula: "Personnalisée",
        indexKey: "CUSTOM",
        source: "Eurostat",
        businessUnit: "BU France",
        responsible: "Jean Martin",
        periodFrom: new Date("2023-02-01"),
        periodTo: new Date("2024-01-31"),
        originalIndexDate: new Date("2023-02-01"),
        revisionIndexDate: new Date("2024-02-10"),
        indices: [
          {
            code: "CUSTOM",
            valueN1: 100,
            valueN: 105,
            source: "Eurostat",
            date: "2024-02-10"
          }
        ],
        oldAmount: "80000.00",
        newAmount: "84000.00",
        previousAmount: "80000.00",
        proposedAmount: "84000.00",
        deltaAmount: "4000.00",
        deltaPercentage: "5.00",
        status: "rejected",
        assignedValidator: "Sophie Bernard",
        validatedBy: "Sophie Bernard",
        validatedAt: new Date("2024-02-11"),
        rejectionReason: "Formule de calcul incorrecte",
        createdAt: new Date("2024-02-10"),
        updatedAt: new Date("2024-02-11"),
      },
    ];

    indexations.forEach(idx => this.indexations.set(idx.id, idx));

    // Seed deadlines
    const deadlines: Deadline[] = [
      {
        id: "ddl-1",
        contractId: "cnt-2",
        contractNumber: "CNT-2023-045",
        type: "end_contract",
        date: new Date("2024-02-15"),
        daysRemaining: 7,
        businessUnit: "IT Services",
        notificationSent: true,
      },
    ];

    deadlines.forEach(ddl => this.deadlines.set(ddl.id, ddl));

    // Seed alerts
    const alerts: Alert[] = [
      {
        id: "alert-1",
        type: "critical",
        category: "sap_error",
        title: "Erreur SAP - Import contrats",
        message: "Échec de synchronisation avec SAP pour 5 contrats",
        isRead: false,
        referenceId: "import-123",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: "alert-2",
        type: "warning",
        category: "workflow_delay",
        title: "Workflow bloqué > 24h",
        message: "Contrat CNT-2024-008 en attente de validation depuis 26h",
        isRead: false,
        referenceId: "cnt-8",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    alerts.forEach(alert => this.alerts.set(alert.id, alert));

    // Seed activity logs
    const activityLogs: ActivityLog[] = [
      {
        id: "log-1",
        userId: "admin-1",
        userName: "Marie Martin",
        action: "approved",
        entityType: "contract",
        entityId: "cnt-3",
        entityReference: "CNT-2024-003",
        details: "Contract validated successfully",
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
      {
        id: "log-2",
        userId: "user-2",
        userName: "Pierre Durand",
        action: "rejected",
        entityType: "indexation",
        entityId: "idx-8",
        entityReference: "IDX-2024-008",
        details: "Indexation rejected due to incorrect indices",
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
    ];

    activityLogs.forEach(log => this.activityLogs.set(log.id, log));

    // Seed import logs
    const importLogs: ImportLog[] = [
      {
        id: "imp-1",
        fileName: "contrats_q1_2024.xlsx",
        author: "Admin User",
        status: "error",
        totalRows: 50,
        successRows: 45,
        errorRows: 5,
        errorReport: "5 rows failed validation - missing required fields",
        createdAt: new Date("2024-02-08T14:30:00"),
      },
    ];

    importLogs.forEach(log => this.importLogs.set(log.id, log));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getContract(id: string): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = randomUUID();
    const now = new Date();
    const contract: Contract = {
      ...insertContract,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;

    const updatedContract: Contract = {
      ...contract,
      ...updates,
      updatedAt: new Date(),
    };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async getValidationRequests(): Promise<ValidationRequest[]> {
    return Array.from(this.validationRequests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getValidationRequest(id: string): Promise<ValidationRequest | undefined> {
    return this.validationRequests.get(id);
  }

  async createValidationRequest(insertRequest: InsertValidationRequest): Promise<ValidationRequest> {
    const id = randomUUID();
    const now = new Date();
    const request: ValidationRequest = {
      ...insertRequest,
      id,
      createdAt: now,
      age: 0,
    };
    this.validationRequests.set(id, request);
    return request;
  }

  async updateValidationRequest(id: string, updates: Partial<ValidationRequest>): Promise<ValidationRequest | undefined> {
    const request = this.validationRequests.get(id);
    if (!request) return undefined;

    const updatedRequest: ValidationRequest = {
      ...request,
      ...updates,
    };
    this.validationRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getIndexations(): Promise<Indexation[]> {
    return Array.from(this.indexations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getIndexation(id: string): Promise<Indexation | undefined> {
    return this.indexations.get(id);
  }

  async createIndexation(insertIndexation: InsertIndexation): Promise<Indexation> {
    const id = randomUUID();
    const indexation: Indexation = {
      ...insertIndexation,
      id,
      createdAt: new Date(),
    };
    this.indexations.set(id, indexation);
    return indexation;
  }

  async updateIndexation(id: string, updates: Partial<Indexation>): Promise<Indexation | undefined> {
    const indexation = this.indexations.get(id);
    if (!indexation) return undefined;

    const updatedIndexation: Indexation = {
      ...indexation,
      ...updates,
    };
    this.indexations.set(id, updatedIndexation);
    return updatedIndexation;
  }

  async getDeadlines(): Promise<Deadline[]> {
    return Array.from(this.deadlines.values()).sort(
      (a, b) => a.daysRemaining - b.daysRemaining
    );
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markAlertAsRead(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = true;
      this.alerts.set(id, alert);
    }
  }

  async markAllAlertsAsRead(): Promise<void> {
    this.alerts.forEach((alert, id) => {
      alert.isRead = true;
      this.alerts.set(id, alert);
    });
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      ...insertLog,
      id,
      createdAt: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return Array.from(this.importLogs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    const validationRequests = await this.getValidationRequests();
    const contracts = await this.getContracts();
    const deadlines = await this.getDeadlines();
    const importLogs = await this.getImportLogs();

    return {
      contractsToValidate: validationRequests.filter(r => r.type === "contract" && r.status === "pending").length,
      indexationsToValidate: validationRequests.filter(r => r.type === "indexation" && r.status === "pending").length,
      dueDatesJ30: deadlines.filter(d => d.daysRemaining <= 30 && d.daysRemaining > 7).length,
      dueDatesJ7: deadlines.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 1).length,
      dueDatesJ1: deadlines.filter(d => d.daysRemaining <= 1).length,
      delayedWorkflows: validationRequests.filter(r => r.age > 1).length,
      pendingTerminations: validationRequests.filter(r => r.type === "termination" && r.status === "pending").length,
      amendmentsToValidate: validationRequests.filter(r => r.type === "amendment" && r.status === "pending").length,
      missingDocuments: contracts.filter(c => !c.hasRequiredDocuments).length,
      importErrors: importLogs.filter(l => l.status === "error").length,
    };
  }
}

export const storage = new MemStorage();
