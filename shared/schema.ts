/**
 * Schéma de base de données KLYXOR pour ENGIE
 * Gère les contrats énergétiques, validations, indexations et workflows
 * Utilise Drizzle ORM avec PostgreSQL et validation Zod
 */
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Table des utilisateurs avec système RBAC
 * Rôles: admin, manager, validator, business_unit_manager, contract_manager, finance_manager
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").notNull(),
  keycloakId: text("keycloak_id"), // ID Keycloak pour SSO
  keycloakSub: text("keycloak_sub"), // Subject ID Keycloak
});

/**
 * Table principale des contrats énergétiques ENGIE
 * Types: électricité, gaz, PPA renouvelables, maintenance infrastructure
 */
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending_validation, active, terminated, closed, archived
  type: text("type").notNull(),
  businessUnit: text("business_unit").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  indexationFrequency: text("indexation_frequency"), // quarterly, annual, monthly, semi-annual
  nextIndexationDate: timestamp("next_indexation_date"),
  indexationFormula: text("indexation_formula"), // 2.A, 2.B, 3, custom
  indexationFormulaId: varchar("indexation_formula_id"),
  indexationBaseAmount: decimal("indexation_base_amount", { precision: 15, scale: 2 }),
  indexationCurrentAmount: decimal("indexation_current_amount", { precision: 15, scale: 2 }),
  indexationIndices: jsonb("indexation_indices"), // 📈 Indices de base {ICHT0: 120.5, FM0A0: 140.2, IPC0: 105.3}
  indexationCap: decimal("indexation_cap", { precision: 5, scale: 2 }), // 🔒 Cap/plafond en % - Limite la hausse max (ex: 10% max)
  indexationThreshold: decimal("indexation_threshold", { precision: 5, scale: 2 }), // ⚠️ Seuil en % - Bloque si variation < seuil (ex: 2% min)
  lastIndexationDate: timestamp("last_indexation_date"),
  // 🎯 Nouveaux champs V3 pour indexation avancée ENGIE
  // Découplage des dates (conf. document ENGIE p.12)
  indexTakingDate: timestamp("index_taking_date"), // Date de prise d'indice (peut différer de la date d'application)
  indexTakingDateRule: text("index_taking_date_rule"), // Règle automatique: "N-2" = indices 2 mois avant, "first_day_month" = 1er du mois
  
  // Mode de calcul du montant de base
  calculationMode: text("calculation_mode"), // "P0" = toujours base initiale, "Pn-1" = dernière valeur indexée
  parkCode: text("park_code"), // Code parc ENGIE pour identification unique (ex: "AUX89", "FIG83")
  
  // 📊 Gestion des paliers tarifaires (année 6 et 11 selon contrats ENGIE)
  tariffTiers: jsonb("tariff_tiers"), // Structure: {year6: {baseAmount: 150000, baseIndices: {ICHT: 125}}, year11: {...}}
  lastTierChangeDate: timestamp("last_tier_change_date"), // Date du dernier changement de palier
  lastTierChangeYear: integer("last_tier_change_year"), // Année du dernier palier activé (6 ou 11)
  createdBy: varchar("created_by").notNull(),
  validatedBy: varchar("validated_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  hasRequiredDocuments: boolean("has_required_documents").notNull().default(false),
});

/**
 * Table des demandes de validation - Workflow d'approbation
 * Types: contrat, indexation, avenant, résiliation, montant manuel
 */
export const validationRequests = pgTable("validation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // contract, indexation, amendment, termination, manual_amount
  referenceId: varchar("reference_id").notNull(),
  reference: text("reference").notNull(),
  subject: text("subject").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  assignedTo: varchar("assigned_to").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, redirected
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  age: integer("age").notNull().default(0), // in days
});

/**
 * Table des formules d'indexation - Calculs de révision tarifaire
 * Types: ICC, ILC, IRL, BT01, FM0A, formules personnalisées
 */
export const indexationFormulas = pgTable("indexation_formulas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  expression: text("expression").notNull(),
  variables: text().array().notNull(), // ["ICHT", "FMOA", "CPI", etc.]
  description: text("description"),
  type: text("type").notNull(), // Type 1, Type 2.A, Type 2.B, Type 3
  formula: text("formula"), // Formule complète
  calculationMode: text("calculation_mode"), // P0, Pn-1
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des valeurs d'indices économiques
 * Gestion des indices provisoires et révisés avec historique complet
 */
export const indexValues = pgTable("index_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  indexCode: text("index_code").notNull(), // ICHT, FM0A, CPI, ICC, ILC, IRL, BT01
  indexName: text("index_name"),
  source: text("source").notNull(), // INSEE, Eurostat, Banque de France
  date: timestamp("date").notNull(), // Date de référence de l'indice
  period: timestamp("period"), // Période concernée (mois/trimestre) - legacy
  publicationDate: timestamp("publication_date"), // Date de publication
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("provisional"), // provisional, definitive
  previousValue: decimal("previous_value", { precision: 10, scale: 4 }),
  variation: decimal("variation", { precision: 5, scale: 2 }), // Variation en %
  isLatest: boolean("is_latest").notNull().default(true),
  metadata: jsonb("metadata"), // Informations supplémentaires
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des propositions d'indexation - Propositions de calcul en attente
 * Créées par le scheduler automatique et en attente de validation
 */
export const indexationProposals = pgTable("indexation_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  contractTitle: text("contract_title").notNull(),
  indexationDate: timestamp("indexation_date").notNull(),
  formulaCode: text("formula_code").notNull(),
  formulaExpression: text("formula_expression"),
  requiredIndices: jsonb("required_indices").notNull(), // ["ICHT", "FM0A", "CPI"]
  indicesValues: jsonb("indices_values"), // {ICHT: {value: 125.3, date: "2024-01", definitive: true}}
  baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
  previousAmount: decimal("previous_amount", { precision: 15, scale: 2 }),
  calculatedAmount: decimal("calculated_amount", { precision: 15, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 15, scale: 2 }),
  deltaAbsolute: decimal("delta_absolute", { precision: 15, scale: 2 }),
  deltaPercent: decimal("delta_percent", { precision: 5, scale: 2 }),
  cappedApplied: boolean("capped_applied").default(false),
  thresholdApplied: boolean("threshold_applied").default(false),
  status: text("status").notNull().default("draft"), // draft, pending, calculated, validated, rejected, applied, error
  calculationDetails: jsonb("calculation_details"), // Full calculation breakdown
  validationDecision: text("validation_decision"), // approve, reject, defer
  validationReason: text("validation_reason"),
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at"),
  appliedAt: timestamp("applied_at"),
  errorMessage: text("error_message"),
  priority: integer("priority").notNull().default(5), // 1=urgent, 5=normal
  createdBy: text("created_by").notNull().default("scheduler"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des indexations - Historique des révisions de prix
 * Fréquences: annuelle, trimestrielle, semestrielle, mensuelle
 */
export const indexations = pgTable("indexations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  contractTitle: text("contract_title").notNull(),
  parkCode: text("park_code"), // Code parc ENGIE
  indexationDate: timestamp("indexation_date").notNull(), // Date d'application
  indexTakingDate: timestamp("index_taking_date"), // Date de prise d'indice (découplée)
  frequency: text("frequency").notNull(), // Annuelle, Trimestrielle, Semestrielle, Mensuelle
  formula: text("formula").notNull(), // ICC, ILC, IRL, BT01, FM0A, Personnalisée
  formulaType: text("formula_type"), // Type 1, Type 2.A, Type 2.B, Type 3
  indexKey: text("index_key"), // BT01, FM0A, etc.
  source: text("source"), // INSEE, Eurostat, Banque de France
  businessUnit: text("business_unit"),
  responsible: text("responsible"),
  periodFrom: timestamp("period_from"),
  periodTo: timestamp("period_to"),
  originalIndexDate: timestamp("original_index_date"),
  revisionIndexDate: timestamp("revision_index_date"),
  // Données d'indices et facteurs
  indices: jsonb("indices"), // {base: {...}, current: {...}, provisional: boolean}
  factorBrut: decimal("factor_brut", { precision: 10, scale: 6 }), // Facteur avant seuil/cap
  factorFinal: decimal("factor_final", { precision: 10, scale: 6 }), // Facteur après seuil/cap
  // Montants
  oldAmount: decimal("old_amount", { precision: 15, scale: 2 }).notNull(),
  newAmount: decimal("new_amount", { precision: 15, scale: 2 }).notNull(),
  previousAmount: decimal("previous_amount", { precision: 15, scale: 2 }),
  proposedAmount: decimal("proposed_amount", { precision: 15, scale: 2 }),
  deltaAmount: decimal("delta_amount", { precision: 15, scale: 2 }).notNull(),
  deltaPercentage: decimal("delta_percentage", { precision: 5, scale: 2 }).notNull(),
  // Règles appliquées
  thresholdApplied: boolean("threshold_applied").default(false),
  thresholdBlocked: boolean("threshold_blocked").default(false), // Indexation bloquée car < seuil
  capApplied: boolean("cap_applied").default(false),
  // Détails et métadonnées
  calculationDetails: jsonb("calculation_details"), // Détails complets du calcul
  retroactivity: jsonb("retroactivity"), // {originalDate, delayDays, adjustmentAmount}
  tierChange: jsonb("tier_change"), // {year, newBaseAmount, newBaseIndices}
  // Statut et validation
  status: text("status").notNull().default("calculated"), // calculated, pending_indices, blocked_threshold, error
  assignedValidator: text("assigned_validator"),
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des avenants - Modifications contractuelles
 * Types: révision tarifaire, changement de périmètre, prolongation, indexation
 */
export const amendments = pgTable("amendments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  number: text("number").notNull().unique(), // AVN-001, AVN-002, etc.
  type: text("type").notNull(), // price_revision, scope_change, duration_extension, indexation_change
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, pending_signature, active, rejected
  effectiveDate: timestamp("effective_date").notNull(),
  originalAmount: decimal("original_amount", { precision: 15, scale: 2 }),
  newAmount: decimal("new_amount", { precision: 15, scale: 2 }),
  impactDescription: text("impact_description"),
  requestedBy: varchar("requested_by").notNull(),
  approvedBy: varchar("approved_by"),
  signedDate: timestamp("signed_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des résiliations - Fin anticipée des contrats
 * Types: non-renouvellement, accord mutuel, rupture, autre
 */
export const terminations = pgTable("terminations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  number: text("number").notNull().unique(), // RE-2025-001, etc.
  reason: text("reason").notNull(),
  type: text("type").notNull(), // non_renewal, mutual_agreement, breach, other
  effectiveDate: timestamp("effective_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending_validation, validated, rejected, executed
  noticeDate: timestamp("notice_date"),
  compensationAmount: decimal("compensation_amount", { precision: 15, scale: 2 }),
  description: text("description"),
  requestedBy: varchar("requested_by").notNull(),
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at"),
  executedBy: varchar("executed_by"),
  executedAt: timestamp("executed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des factures - Gestion de la facturation
 * Types: mensuelle, trimestrielle, régularisation, clôture
 */
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").notNull(), // monthly, quarterly, regularization, closing
  period: text("period"),
  description: text("description"),
  baseAmount: decimal("base_amount", { precision: 15, scale: 2 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default(sql`20`),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft, generated, sent, paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  indexationApplied: boolean("indexation_applied").default(false),
  indexationType: text("indexation_type"),
  indexationRate: decimal("indexation_rate", { precision: 10, scale: 6 }),
  adjustmentAmount: decimal("adjustment_amount", { precision: 15, scale: 2 }),
  penaltyAmount: decimal("penalty_amount", { precision: 15, scale: 2 }),
  depositReturn: decimal("deposit_return", { precision: 15, scale: 2 }),
  consumptionEstimated: decimal("consumption_estimated", { precision: 15, scale: 2 }),
  consumptionActual: decimal("consumption_actual", { precision: 15, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 4 }),
  isFinal: boolean("is_final").default(false),
  generatedAt: timestamp("generated_at"),
  generatedBy: varchar("generated_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  user: text("user").notNull(),
  action: text("action").notNull(),
  fields: text("fields"),
  before: text("before"),
  after: text("after"),
  traceId: text("trace_id").notNull(),
  contractNumber: text("contract_number"),
  description: text("description"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Deadlines table
export const deadlines = pgTable("deadlines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  type: text("type").notNull(), // end_contract, anniversary, amendment
  date: timestamp("date").notNull(),
  daysRemaining: integer("days_remaining").notNull(),
  businessUnit: text("business_unit").notNull(),
  notificationSent: boolean("notification_sent").notNull().default(false),
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  type: text("type").notNull(), // workflow, deadline, system, error
  severity: text("severity").notNull(), // critical, warning, info
  category: text("category"), // sap_error, workflow_delay, deadline, validation
  title: text("title"),
  message: text("message").notNull(),
  contractNumber: text("contract_number"),
  sendStatus: text("send_status").notNull().default("pending"), // pending, sent, failed
  readStatus: boolean("read_status").notNull().default(false),
  channel: text("channel").notNull().default("in-app"), // in-app, email, sms
  userId: varchar("user_id"),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  entityReference: text("entity_reference").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Import logs table
export const importLogs = pgTable("import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  author: text("author").notNull(),
  status: text("status").notNull(), // success, error, partial
  totalRows: integer("total_rows").notNull(),
  successRows: integer("success_rows").notNull(),
  errorRows: integer("error_rows").notNull(),
  errorReport: text("error_report"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Payment blocks table
export const paymentBlocks = pgTable("payment_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flowId: varchar("flow_id").notNull(),
  contractId: varchar("contract_id").notNull(),
  contractName: text("contract_name").notNull(),
  amountBefore: decimal("amount_before", { precision: 15, scale: 2 }).notNull(),
  amountAfter: decimal("amount_after", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  blockDate: timestamp("block_date").notNull().default(sql`now()`),
  modifiedBy: varchar("modified_by").notNull(),
  decisionMaker: varchar("decision_maker"),
  decisionStatus: text("decision_status").notNull().default("to_validate"), // to_validate, validated, rejected
  reason: text("reason").notNull(),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Payment proofs table
export const paymentProofs = pgTable("payment_proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull(),
  invoiceId: varchar("invoice_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  method: text("method").notNull(),
  beneficiary: text("beneficiary").notNull(),
  proofAvailable: boolean("proof_available").notNull().default(false),
  proofUrl: text("proof_url"),
  lastSent: timestamp("last_sent"),
  sentTo: text().array(),
  contractId: varchar("contract_id").notNull(),
  contractName: text("contract_name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Documents table (GED)
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // contract, amendment, invoice, attestation, other
  category: text("category").notNull(), // legal, financial, technical, administrative
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  metadata: jsonb("metadata"),
  tags: text().array(),
  status: text("status").notNull().default("active"), // active, archived, deleted
  version: integer("version").notNull().default(1),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  lastAccessedAt: timestamp("last_accessed_at"),
  isConfidential: boolean("is_confidential").notNull().default(false),
  retentionDate: timestamp("retention_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Export jobs table
export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  format: text("format").notNull(), // xlsx, csv
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  progress: integer("progress").notNull().default(0),
  requestedAt: timestamp("requested_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
  requestedBy: varchar("requested_by").notNull(),
  filters: jsonb("filters"),
  columns: text().array(),
  rowCount: integer("row_count"),
  fileSize: text("file_size"),
  fileUrl: text("file_url"),
  traceId: text("trace_id").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Security events table
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // login, logout, access_denied, data_export, sensitive_access
  userId: varchar("user_id"),
  userName: text("user_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"),
  action: text("action"),
  result: text("result").notNull(), // success, failure
  reason: text("reason"),
  metadata: jsonb("metadata"),
  severity: text("severity").notNull().default("info"), // info, warning, critical
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // contract, payment, validation, deadline
  entityId: varchar("entity_id").notNull(),
  reminderType: text("reminder_type").notNull(), // email, sms, in_app
  recipientId: varchar("recipient_id").notNull(),
  recipientEmail: text("recipient_email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  sentDate: timestamp("sent_date"),
  status: text("status").notNull().default("pending"), // pending, sent, failed, cancelled
  priority: text("priority").notNull().default("normal"), // low, normal, high, critical
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Workflow definitions table
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entity_type").notNull(), // contract, payment, indexation, amendment
  steps: jsonb("steps").notNull(), // array of workflow steps
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Workflow instances table
export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  definitionId: varchar("definition_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, cancelled, failed
  data: jsonb("data"),
  startedBy: varchar("started_by").notNull(),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Create schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertValidationRequestSchema = createInsertSchema(validationRequests).omit({
  id: true,
  createdAt: true,
  age: true,
});

export const insertIndexationFormulaSchema = createInsertSchema(indexationFormulas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndexValueSchema = createInsertSchema(indexValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndexationProposalSchema = createInsertSchema(indexationProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndexationSchema = createInsertSchema(indexations).omit({
  id: true,
  createdAt: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({
  id: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAmendmentSchema = createInsertSchema(amendments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerminationSchema = createInsertSchema(terminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentBlockSchema = createInsertSchema(paymentBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentProofSchema = createInsertSchema(paymentProofs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
});

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  createdAt: true,
  requestedAt: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type IndexationProposal = typeof indexationProposals.$inferSelect;
export type InsertIndexationProposal = z.infer<typeof insertIndexationProposalSchema>;
export type ValidationRequest = typeof validationRequests.$inferSelect;
export type InsertValidationRequest = z.infer<typeof insertValidationRequestSchema>;
export type IndexationFormula = typeof indexationFormulas.$inferSelect;
export type InsertIndexationFormula = z.infer<typeof insertIndexationFormulaSchema>;
export type IndexValue = typeof indexValues.$inferSelect;
export type InsertIndexValue = z.infer<typeof insertIndexValueSchema>;
export type Indexation = typeof indexations.$inferSelect;
export type InsertIndexation = z.infer<typeof insertIndexationSchema>;
export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type Amendment = typeof amendments.$inferSelect;
export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;
export type Termination = typeof terminations.$inferSelect;
export type InsertTermination = z.infer<typeof insertTerminationSchema>;
export type PaymentBlock = typeof paymentBlocks.$inferSelect;
export type InsertPaymentBlock = z.infer<typeof insertPaymentBlockSchema>;
export type PaymentProof = typeof paymentProofs.$inferSelect;
export type InsertPaymentProof = z.infer<typeof insertPaymentProofSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ExportJob = typeof exportJobs.$inferSelect;
export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;

/**
 * Table des préférences de notification utilisateur
 * Gère comment chaque utilisateur souhaite recevoir ses alertes
 */
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  channel: text("channel").notNull(), // email, interface, teams
  alertType: text("alert_type").notNull(), // deadline, validation, workflow, sap_error, amount_change
  enabled: boolean("enabled").notNull().default(true),
  threshold: decimal("threshold", { precision: 10, scale: 2 }), // Pour amount_change (pourcentage)
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Schémas et types pour notificationPreferences
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdContracts: many(contracts, { relationName: "createdBy" }),
  validatedContracts: many(contracts, { relationName: "validatedBy" }),
  activityLogs: many(activityLogs),
  notificationPreferences: many(notificationPreferences),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  validatedBy: one(users, {
    fields: [contracts.validatedBy],
    references: [users.id],
    relationName: "validatedBy",
  }),
  indexations: many(indexations),
  deadlines: many(deadlines),
  amendments: many(amendments),
  terminations: many(terminations),
}));

export const amendmentsRelations = relations(amendments, ({ one }) => ({
  contract: one(contracts, {
    fields: [amendments.contractId],
    references: [contracts.id],
  }),
  requestedBy: one(users, {
    fields: [amendments.requestedBy],
    references: [users.id],
    relationName: "requestedBy",
  }),
  approvedBy: one(users, {
    fields: [amendments.approvedBy],
    references: [users.id],
    relationName: "approvedBy",
  }),
}));

export const indexationsRelations = relations(indexations, ({ one }) => ({
  contract: one(contracts, {
    fields: [indexations.contractId],
    references: [contracts.id],
  }),
  validatedBy: one(users, {
    fields: [indexations.validatedBy],
    references: [users.id],
  }),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  contract: one(contracts, {
    fields: [deadlines.contractId],
    references: [contracts.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

/**
 * Table des indices économiques INSEE/Eurostat
 * Stockage des indices IPC, ICHT, IPPAP, etc.
 */
export const economicIndices = pgTable("economic_indices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesId: text("series_id").notNull(), // ID de la série INSEE (ex: 001763852)
  code: text("code").notNull(), // Code court (IPC, ICHT, IPPAP)
  name: text("name").notNull(), // Nom complet de l'indice
  date: timestamp("date").notNull(), // Date de l'indice (premier jour du mois)
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Valeur de l'indice
  year: integer("year").notNull(), // Année
  month: integer("month").notNull(), // Mois (1-12)
  base: text("base").notNull(), // Base de l'indice (2015, 2008, etc.)
  source: text("source").notNull().default("INSEE"), // Source (INSEE, Eurostat, etc.)
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Schémas et types pour economicIndices
export const insertEconomicIndexSchema = createInsertSchema(economicIndices).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertEconomicIndex = z.infer<typeof insertEconomicIndexSchema>;
export type SelectEconomicIndex = typeof economicIndices.$inferSelect;

/**
 * Table des affectations de validation par parc
 * Gère les validateurs principaux et suppléants par code parc et business unit
 */
export const validationAssignments = pgTable("validation_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parkCode: text("park_code").notNull().unique(), // Code du parc (ex: AUX89, FIG83)
  businessUnit: text("business_unit").notNull(), // Business unit (ex: ENGIE Green)
  mainValidatorId: varchar("main_validator_id").notNull(), // ID du validateur principal
  mainValidatorName: text("main_validator_name").notNull(), // Nom du validateur principal
  backupValidatorId: varchar("backup_validator_id"), // ID du validateur suppléant
  backupValidatorName: text("backup_validator_name"), // Nom du validateur suppléant
  isActive: boolean("is_active").notNull().default(true),
  autoReminder: boolean("auto_reminder").notNull().default(true), // Relances automatiques
  reminderDelay: integer("reminder_delay").notNull().default(24), // Délai en heures avant rappel
  escalationDelay: integer("escalation_delay").notNull().default(48), // Délai avant escalade
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Schémas et types pour validationAssignments
export const insertValidationAssignmentSchema = createInsertSchema(validationAssignments).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertValidationAssignment = z.infer<typeof insertValidationAssignmentSchema>;
export type SelectValidationAssignment = typeof validationAssignments.$inferSelect;

/**
 * Table des fréquences et périmètres d'indexation
 * Configure la fréquence et le périmètre d'indexation par contrat
 */
export const indexationFrequencies = pgTable("indexation_frequencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractCode: text("contract_code").notNull().unique(), // Code du contrat (ex: AUX89, FIG83)
  frequency: text("frequency").notNull(), // Annuelle, Trimestrielle, Mensuelle, Semestrielle
  scope: text("scope").notNull(), // Maintenance complète, Production + Maintenance, Opérations + Énergie, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Schémas et types pour indexationFrequencies
export const insertIndexationFrequencySchema = createInsertSchema(indexationFrequencies).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertIndexationFrequency = z.infer<typeof insertIndexationFrequencySchema>;
export type SelectIndexationFrequency = typeof indexationFrequencies.$inferSelect;

// Relations pour validationAssignments
export const validationAssignmentsRelations = relations(validationAssignments, ({ one }) => ({
  mainValidator: one(users, {
    fields: [validationAssignments.mainValidatorId],
    references: [users.id],
    relationName: "mainValidator",
  }),
  backupValidator: one(users, {
    fields: [validationAssignments.backupValidatorId],
    references: [users.id],
    relationName: "backupValidator",
  }),
}));

export const terminationsRelations = relations(terminations, ({ one }) => ({
  contract: one(contracts, {
    fields: [terminations.contractId],
    references: [contracts.id],
  }),
  requestedBy: one(users, {
    fields: [terminations.requestedBy],
    references: [users.id],
    relationName: "terminationRequestedBy",
  }),
  validatedBy: one(users, {
    fields: [terminations.validatedBy],
    references: [users.id],
    relationName: "terminationValidatedBy",
  }),
  executedBy: one(users, {
    fields: [terminations.executedBy],
    references: [users.id],
    relationName: "terminationExecutedBy",
  }),
}));

/**
 * Table des synchronisations SAP
 * Gère la synchronisation bidirectionnelle avec SAP
 */
export const sapSynchronizations = pgTable("sap_synchronizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  sapOrderNumber: text("sap_order_number"), // Numéro de commande SAP
  action: text("action").notNull(), // create, update, terminate
  direction: text("direction").notNull(), // to_sap, from_sap
  status: text("status").notNull().default("pending"), // pending, processing, success, error, retry
  payload: jsonb("payload").notNull(), // Données envoyées/reçues
  response: jsonb("response"), // Réponse SAP
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

/**
 * Table des relances automatiques
 * Gère les rappels et escalades pour les validations
 */
export const validationReminders = pgTable("validation_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  validationRequestId: varchar("validation_request_id").notNull(),
  type: text("type").notNull(), // reminder, escalation
  level: integer("level").notNull().default(1), // Niveau de relance (1, 2, 3...)
  sentTo: text("sent_to").notNull(), // Email ou ID utilisateur
  sentAt: timestamp("sent_at").notNull().default(sql`now()`),
  nextReminderAt: timestamp("next_reminder_at"),
  status: text("status").notNull().default("sent"), // sent, acknowledged, escalated
  message: text("message"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/**
 * Table des règles de transition d'état
 * Configure les transitions automatiques du cycle de vie
 */
export const stateTransitionRules = pgTable("state_transition_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  condition: text("condition").notNull(), // validation_approved, contract_expired, payment_completed
  requiresValidation: boolean("requires_validation").notNull().default(false),
  autoExecute: boolean("auto_execute").notNull().default(false),
  validatorRole: text("validator_role"), // Role requis pour la validation
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Schémas et types pour sapSynchronizations
export const insertSapSynchronizationSchema = createInsertSchema(sapSynchronizations).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertSapSynchronization = z.infer<typeof insertSapSynchronizationSchema>;
export type SapSynchronization = typeof sapSynchronizations.$inferSelect;

// Schémas et types pour validationReminders
export const insertValidationReminderSchema = createInsertSchema(validationReminders).omit({ 
  id: true,
  createdAt: true 
});

export type InsertValidationReminder = z.infer<typeof insertValidationReminderSchema>;
export type ValidationReminder = typeof validationReminders.$inferSelect;

// Schémas et types pour stateTransitionRules
export const insertStateTransitionRuleSchema = createInsertSchema(stateTransitionRules).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertStateTransitionRule = z.infer<typeof insertStateTransitionRuleSchema>;
export type StateTransitionRule = typeof stateTransitionRules.$inferSelect;

/**
 * Table des snippets de code partagés
 * Permet le partage contextuel de code avec preview et syntax highlighting
 */
export const codeSnippets = pgTable("code_snippets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  language: text("language").notNull(), // javascript, typescript, sql, json, yaml, etc.
  context: text("context"), // contract, indexation, validation, billing, etc.
  contextId: varchar("context_id"), // ID de l'entité associée (contract ID, etc.)
  tags: text().array(), // Tags pour recherche et catégorisation
  isPublic: boolean("is_public").notNull().default(false),
  createdBy: varchar("created_by").notNull(),
  sharedWith: text().array(), // Liste des user IDs avec qui c'est partagé
  viewCount: integer("view_count").notNull().default(0),
  copyCount: integer("copy_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Relations pour codeSnippets
export const codeSnippetsRelations = relations(codeSnippets, ({ one }) => ({
  creator: one(users, {
    fields: [codeSnippets.createdBy],
    references: [users.id],
    relationName: "snippetCreator",
  }),
}));

// Schémas et types pour codeSnippets
export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({ 
  id: true,
  viewCount: true,
  copyCount: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;
