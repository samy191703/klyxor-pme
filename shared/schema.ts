/**
 * KLYXOR / ENGIE — Drizzle ORM (PostgreSQL)
 * Refactoring: FKs cohérentes, relations non-redondantes, index / uniques normalisés
 */
import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  jsonb,
  decimal,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Languages } from "./enums/contracts";

/* --------------------------------- USERS --------------------------------- */

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").notNull(),
  keycloakId: text("keycloak_id"),
  keycloakSub: text("keycloak_sub"),
});

/* ------------------------------- CONTRACTS -------------------------------- */

export const contracts = pgTable(
  "contracts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    number: text("number").notNull().unique(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    type: text("type").notNull(),

    clientName: text("client_name").notNull().default("Client inconnu"),
    language: text("language").notNull().default(Languages.FR),
    technology: text("technology"),
    maintainer: text("maintainer"),
    businessUnit: text("business_unit").notNull(),

    amount: decimal("amount", { precision: 15, scale: 2 }).$type<number>(),
    billingPeriod: text("billing_period"),
    billingFrequency: text("billing_frequency"),
    billingType: text("billing_type"),
    paymentType: text("payment_type"),

    maxAnnualProduction: text("max_annual_production"),
    numberOfTurbines: text("number_of_turbines"),
    pricePerMWh: text("price_per_mwh"),

    currency: text("currency").notNull().default("EUR"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),

    indexationEnabled: boolean("indexation_enabled").notNull().default(false),
    indexationFrequency: text("indexation_frequency"),
    indexationDate: timestamp("indexation_date"),
    nextIndexationDate: timestamp("next_indexation_date"),
    indexationFormula: text("indexation_formula"),
    indexationFormulaId: varchar("indexation_formula_id"),
    indexationCap: decimal("indexation_cap", {
      precision: 5,
      scale: 2,
    }).$type<number>(),
    indexationThreshold: decimal("indexation_threshold", {
      precision: 5,
      scale: 2,
    }).$type<number>(),
    calculationMode: text("calculation_mode"),
    indexTakingDateRule: text("index_taking_date_rule"),
    indexTakingDate: timestamp("index_taking_date"),

    requireRevised: text("require_revised"),

    indexationBaseAmount: decimal("indexation_base_amount", {
      precision: 15,
      scale: 2,
    }).$type<number>(),
    indexationCurrentAmount: decimal("indexation_current_amount", {
      precision: 15,
      scale: 2,
    }).$type<number>(),
    indexationBaseAmountSeries: jsonb("indexation_base_amount_series"),
    indexationBaseIndicesSeries: jsonb("indexation_base_indices_series"),
    indexationBaseIndicesValues: jsonb("indexation_base_indices_values"),
    lastIndexationPreview: jsonb("last_indexation_preview"),
    parkCode: text("park_code"),

    tariffTiers: jsonb("tariff_tiers"),
    lastTierChangeDate: timestamp("last_tier_change_date"),
    lastTierChangeYear: integer("last_tier_change_year"),

    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    validatedBy: varchar("validated_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),

    hasRequiredDocuments: boolean("has_required_documents")
      .notNull()
      .default(false),
  },
  (t) => ({
    byStatus: index("idx_contracts_status").on(t.status),
    byBU: index("idx_contracts_bu").on(t.businessUnit),
    byPark: index("idx_contracts_park").on(t.parkCode),
  })
);

/* ------------------------- VALIDATION REQUESTS ---------------------------- */

export const validationRequests = pgTable(
  "validation_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Core
    type: text("type").notNull(), // contract | indexation | amendment | termination | manual_amount
    referenceId: varchar("reference_id").notNull(),
    reference: text("reference").notNull(),
    subject: text("subject").notNull(),

    // Relations (FK -> users)
    requestedBy: varchar("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedTo: varchar("assigned_to")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Lifecycle
    status: text("status").notNull().default("pending"), // pending | approved | rejected | redirected
    reason: text("reason"), // free-form notes; also used on reject in your routes

    // Decision stamps (added)
    validatedBy: varchar("validated_by").references(() => users.id, {
      onDelete: "set null",
    }), // nullable
    validatedAt: timestamp("validated_at"), // nullable

    // Timestamps
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`), // will be auto-bumped via trigger (below)

    // Aging
    age: integer("age").notNull().default(0),
  },
  (t) => ({
    byStatus: index("idx_validation_requests_status").on(t.status),
    byAssigned: index("idx_validation_requests_assigned").on(t.assignedTo),
    refIdType: index("idx_validation_requests_refid_type").on(
      t.referenceId,
      t.type
    ),
    byRequested: index("idx_validation_requests_requested_by").on(
      t.requestedBy
    ),
    byValidated: index("idx_validation_requests_validated_by").on(
      t.validatedBy
    ),
    // (optional) compact filter combos often used by UI tables:
    byAssignedStatus: index("idx_validation_requests_assigned_status").on(
      t.assignedTo,
      t.status
    ),
  })
);

/* ----------------------- VALIDATION REQUESTS RULES ------------------------ */

export const validationRequestsRules = pgTable(
  "validation_requests_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Matching keys (keep it simple & extensible)
    type: text("type").notNull(), // contract | amendment | termination | indexation | ...
    scopeBusinessUnit: text("scope_business_unit"),
    scopeContractType: text("scope_contract_type"),
    scopeParkCode: text("scope_park_code"),
    amountMin: decimal("amount_min", { precision: 15, scale: 2 }),
    amountMax: decimal("amount_max", { precision: 15, scale: 2 }),

    // Selected assignee (the ONLY thing we ultimately need)
    selectedUserId: varchar("selected_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Rule control
    priority: integer("priority").notNull().default(100), // lower = higher priority
    isActive: boolean("is_active").notNull().default(true),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),

    // Audit
    createdBy: varchar("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byTypeActive: index("idx_vrr_type_active").on(t.type, t.isActive),
    byPriority: index("idx_vrr_priority").on(t.priority),
    byScopes: index("idx_vrr_scopes").on(
      t.scopeBusinessUnit,
      t.scopeContractType,
      t.scopeParkCode
    ),
  })
);

export const insertValidationRequestsRuleSchema = createInsertSchema(
  validationRequestsRules
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ValidationRequestsRule =
  typeof validationRequestsRules.$inferSelect;
export type InsertValidationRequestsRule = z.infer<
  typeof insertValidationRequestsRuleSchema
>;

/* ------------------------- INDEXATION FORMULAS ---------------------------- */

export const indexationFormulas = pgTable(
  "indexation_formulas",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    expression: text("expression").notNull(),
    variables: text().array().notNull(),
    description: text("description"),
    type: text("type").notNull(),
    formula: text("formula"),
    calculationMode: text("calculation_mode"), // P0, Pn-1
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byActive: index("idx_idxformulas_active").on(t.isActive),
  })
);

export const indexValues = pgTable(
  "index_values",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    indexCode: text("index_code").notNull(), // ICHT, FM0A, CPI, ICC, ILC, IRL, BT01
    indexName: text("index_name"),
    source: text("source").notNull(), // INSEE, Eurostat, ...
    date: timestamp("date").notNull(), // Date de référence de l'indice
    period: timestamp("period"),
    publicationDate: timestamp("publication_date"),
    value: decimal("value", { precision: 10, scale: 4 }).notNull(),
    status: text("status").notNull().default("provisional"), // provisional, definitive
    previousValue: decimal("previous_value", { precision: 10, scale: 4 }),
    variation: decimal("variation", { precision: 5, scale: 2 }),
    isLatest: boolean("is_latest").notNull().default(true),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqByCodeDateSource: uniqueIndex("ux_index_values_code_date_src").on(
      t.indexCode,
      t.date,
      t.source,
      t.status
    ),
    byLatest: index("idx_index_values_latest").on(t.isLatest),
  })
);

/* ------------------------ INDEXATION PROPOSALS ---------------------------- */

export const indexationProposals = pgTable(
  "indexation_proposals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    contractNumber: text("contract_number").notNull(),
    contractTitle: text("contract_title").notNull(),
    indexationDate: timestamp("indexation_date").notNull(),
    formulaCode: text("formula_code").notNull(),
    formulaExpression: text("formula_expression"),
    requiredIndices: jsonb("required_indices").notNull(),
    indicesValues: jsonb("indices_values"),
    baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
    previousAmount: decimal("previous_amount", { precision: 15, scale: 2 }),
    calculatedAmount: decimal("calculated_amount", { precision: 15, scale: 2 }),
    finalAmount: decimal("final_amount", { precision: 15, scale: 2 }),
    deltaAbsolute: decimal("delta_absolute", { precision: 15, scale: 2 }),
    deltaPercent: decimal("delta_percent", { precision: 5, scale: 2 }),
    cappedApplied: boolean("capped_applied").default(false),
    thresholdApplied: boolean("threshold_applied").default(false),
    status: text("status").notNull().default("draft"),
    calculationDetails: jsonb("calculation_details"),
    validationDecision: text("validation_decision"),
    validationReason: text("validation_reason"),
    validatedBy: varchar("validated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    validatedAt: timestamp("validated_at"),
    appliedAt: timestamp("applied_at"),
    errorMessage: text("error_message"),
    priority: integer("priority").notNull().default(5),
    createdBy: text("created_by").notNull().default("scheduler"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContractDate: index("idx_idxprops_contract_date").on(
      t.contractId,
      t.indexationDate
    ),
    byStatus: index("idx_idxprops_status").on(t.status),
  })
);

/* ----------------------------- INDEXATIONS -------------------------------- */

export const indexations = pgTable(
  "indexations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    contractNumber: text("contract_number").notNull(),
    contractTitle: text("contract_title").notNull(),
    parkCode: text("park_code"),
    indexationDate: timestamp("indexation_date").notNull(),
    indexTakingDate: timestamp("index_taking_date"),
    frequency: text("frequency").notNull(),
    formula: text("formula").notNull(),
    formulaType: text("formula_type"),
    indexKey: text("index_key"),
    source: text("source"),
    businessUnit: text("business_unit"),
    responsible: text("responsible"),
    periodFrom: timestamp("period_from"),
    periodTo: timestamp("period_to"),
    originalIndexDate: timestamp("original_index_date"),
    revisionIndexDate: timestamp("revision_index_date"),
    indices: jsonb("indices"),
    factorBrut: decimal("factor_brut", { precision: 10, scale: 6 }),
    factorFinal: decimal("factor_final", { precision: 10, scale: 6 }),
    oldAmount: decimal("old_amount", { precision: 15, scale: 2 }).notNull(),
    newAmount: decimal("new_amount", { precision: 15, scale: 2 }).notNull(),
    previousAmount: decimal("previous_amount", { precision: 15, scale: 2 }),
    proposedAmount: decimal("proposed_amount", { precision: 15, scale: 2 }),
    deltaAmount: decimal("delta_amount", { precision: 15, scale: 2 }).notNull(),
    deltaPercentage: decimal("delta_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),
    thresholdApplied: boolean("threshold_applied").default(false),
    thresholdBlocked: boolean("threshold_blocked").default(false),
    capApplied: boolean("cap_applied").default(false),
    calculationDetails: jsonb("calculation_details"),
    retroactivity: jsonb("retroactivity"),
    tierChange: jsonb("tier_change"),
    status: text("status").notNull().default("calculated"),
    assignedValidator: text("assigned_validator"),
    validatedBy: varchar("validated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    validatedAt: timestamp("validated_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContractDate: index("idx_indexations_contract_date").on(
      t.contractId,
      t.indexationDate
    ),
    byStatus: index("idx_indexations_status").on(t.status),
  })
);

/* ------------------------------ AMENDMENTS -------------------------------- */

export const amendments = pgTable(
  "amendments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    number: text("number").notNull().unique(),
    type: text("type").notNull(),
    title: text("title"),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    effectiveDate: timestamp("effective_date"),
    originalAmount: decimal("original_amount", { precision: 15, scale: 2 }),
    newAmount: decimal("new_amount", { precision: 15, scale: 2 }),
    impactDescription: text("impact_description"),
    requestedBy: varchar("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    signedDate: timestamp("signed_date"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_amendments_contract").on(t.contractId),
    byStatus: index("idx_amendments_status").on(t.status),
  })
);

/* ------------------------------ TERMINATIONS ------------------------------ */

export const terminations = pgTable(
  "terminations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    number: text("number").notNull().unique(), // e.g. RE-2025-001
    reason: text("reason").notNull(),
    type: text("type").notNull(), // "non_renewal" | "mutual_agreement" | "breach" | "other"
    effectiveDate: timestamp("effective_date").notNull(),
    status: text("status").notNull().default("draft"),
    noticeDate: timestamp("notice_date"),
    compensationAmount: decimal("compensation_amount", {
      precision: 15,
      scale: 2,
    }),
    description: text("description"),
    requestedBy: varchar("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    validatedBy: varchar("validated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    validatedAt: timestamp("validated_at"),
    assignedValidator: varchar("assigned_validator").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    rejectionReason: text("rejection_reason"),
    // ✅ colonne manquante ajoutée (tu avais une relation vers executedBy)
    executedBy: varchar("executed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_terminations_contract").on(t.contractId),
    byStatus: index("idx_terminations_status").on(t.status),
    byRequested: index("idx_terminations_requested_by").on(t.requestedBy),
    byAssigned: index("idx_terminations_assigned_validator").on(
      t.assignedValidator
    ),
  })
);

export const billingSchedules = pgTable(
  "billing_schedules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),

    // ✅ timestamps au lieu de date()
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),

    // ✅ enums en string
    frequency: text("frequency").notNull(), // "MONTHLY" | "QUARTERLY" | "ANNUAL" | "MILESTONE"
    billingType: text("billing_type").notNull(), // "A_ECHOIR" | "TERME_ECHU"

    version: integer("version").notNull(),
    status: text("status").notNull().default("draft"), // "draft" | "active" | "archived"

    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    // 🔒 Unicité (contract_id, version)
    uqContractVersion: uniqueIndex("uq_billing_schedules_contract_version").on(
      t.contractId,
      t.version
    ),

    byContract: index("idx_billing_schedules_contract").on(t.contractId),
    byStatus: index("idx_billing_schedules_status").on(t.status),
    byDates: index("idx_billing_schedules_dates").on(t.startDate, t.endDate),
  })
);

/* -------------------------------- BILLING LINES ------------------------------ */

export const billingLines = pgTable( 
  "billing_lines",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    scheduleId: varchar("schedule_id")
      .notNull()
      .references(() => billingSchedules.id, { onDelete: "cascade" }),

    sequenceNo: integer("sequence_no").notNull(), // 1..N

    // ✅ timestamp (due_date)
    dueDate: timestamp("due_date").notNull(),

    amountHt: decimal("amount_ht", { precision: 15, scale: 2 }).notNull(),
    status: text("status").notNull().default("A_FACTURER"), // "A_FACTURER" | "FACTUREE"

    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    // 🔒 Unicité (schedule_id, due_date)
    uqScheduleDueDate: uniqueIndex("uq_billing_lines_schedule_duedate").on(
      t.scheduleId,
      t.dueDate
    ),

    bySchedule: index("idx_billing_lines_schedule").on(t.scheduleId),
    byDueDate: index("idx_billing_lines_duedate").on(t.dueDate),
    byScheduleDueDate: index("idx_billing_lines_schedule_duedate").on(
      t.scheduleId,
      t.dueDate
    ),
  })
);

/* -------------------------------- INVOICES -------------------------------- */

export const invoices = pgTable(
  "invoices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    type: text("type").notNull(),
    period: text("period"),
    description: text("description"),
    baseAmount: decimal("base_amount", { precision: 15, scale: 2 }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default(sql`20`),
    vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
    status: text("status").notNull().default("draft"),
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
    consumptionEstimated: decimal("consumption_estimated", {
      precision: 15,
      scale: 2,
    }),
    consumptionActual: decimal("consumption_actual", {
      precision: 15,
      scale: 2,
    }),
    unitPrice: decimal("unit_price", { precision: 10, scale: 4 }),
    isFinal: boolean("is_final").default(false),
    generatedAt: timestamp("generated_at"),
    generatedBy: varchar("generated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_invoices_contract").on(t.contractId),
    byStatus: index("idx_invoices_status").on(t.status),
    byDueDate: index("idx_invoices_due").on(t.dueDate),
  })
);

/* ------------------------------- DEADLINES -------------------------------- */

export const deadlines = pgTable(
  "deadlines",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    contractNumber: text("contract_number").notNull(),
    type: text("type").notNull(), // end_contract, anniversary, amendment
    date: timestamp("date").notNull(),
    daysRemaining: integer("days_remaining").notNull(),
    businessUnit: text("business_unit").notNull(),
    notificationSent: boolean("notification_sent").notNull().default(false),
  },
  (t) => ({
    byContractDate: index("idx_deadlines_contract_date").on(
      t.contractId,
      t.date
    ),
  })
);

/* --------------------------------- ALERTS --------------------------------- */

export const alerts = pgTable(
  "alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    timestamp: timestamp("timestamp")
      .notNull()
      .default(sql`now()`),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    category: text("category"),
    title: text("title"),
    message: text("message").notNull(),
    contractNumber: text("contract_number"),
    sendStatus: text("send_status").notNull().default("pending"),
    readStatus: boolean("read_status").notNull().default(false),
    channel: text("channel").notNull().default("in-app"),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    referenceId: varchar("reference_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byUser: index("idx_alerts_user").on(t.userId),
    bySend: index("idx_alerts_send_status").on(t.sendStatus),
  })
);

/* ------------------------------ ACTIVITY LOGS ----------------------------- */

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    entityReference: text("entity_reference").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byUser: index("idx_activity_user").on(t.userId),
    byEntity: index("idx_activity_entity").on(t.entityType, t.entityId),
  })
);

/* ------------------------------- IMPORT LOGS ------------------------------ */

export const importLogs = pgTable("import_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  author: text("author").notNull(),
  status: text("status").notNull(),
  totalRows: integer("total_rows").notNull(),
  successRows: integer("success_rows").notNull(),
  errorRows: integer("error_rows").notNull(),
  errorReport: text("error_report"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

/* ------------------------------ PAYMENT BLOCKS ---------------------------- */

export const paymentBlocks = pgTable(
  "payment_blocks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    flowId: varchar("flow_id").notNull(),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    contractName: text("contract_name").notNull(),
    amountBefore: decimal("amount_before", {
      precision: 15,
      scale: 2,
    }).notNull(),
    amountAfter: decimal("amount_after", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    blockDate: timestamp("block_date")
      .notNull()
      .default(sql`now()`),
    modifiedBy: varchar("modified_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decisionMaker: varchar("decision_maker").references(() => users.id, {
      onDelete: "set null",
    }),
    decisionStatus: text("decision_status").notNull().default("to_validate"),
    reason: text("reason").notNull(),
    dueDate: timestamp("due_date").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_payment_blocks_contract").on(t.contractId),
    byStatus: index("idx_payment_blocks_status").on(t.decisionStatus),
  })
);

/* ------------------------------ PAYMENT PROOFS ---------------------------- */

export const paymentProofs = pgTable(
  "payment_proofs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    contractName: text("contract_name").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_payment_proofs_contract").on(t.contractId),
  })
);

/* -------------------------------- DOCUMENTS ------------------------------- */

export const documents = pgTable(
  "documents",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id").references(() => contracts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    category: text("category").notNull(),
    size: integer("size").notNull(),
    mimeType: text("mime_type").notNull(),
    url: text("url").notNull(),
    metadata: jsonb("metadata"),
    tags: text().array(),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    uploadedBy: varchar("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at")
      .notNull()
      .default(sql`now()`),
    lastAccessedAt: timestamp("last_accessed_at"),
    isConfidential: boolean("is_confidential").notNull().default(false),
    retentionDate: timestamp("retention_date"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_documents_contract").on(t.contractId),
    byType: index("idx_documents_type").on(t.type),
  })
);

/* -------------------------------- EXPORT JOBS ----------------------------- */

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    format: text("format").notNull(),
    status: text("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    requestedAt: timestamp("requested_at")
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at"),
    requestedBy: varchar("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    filters: jsonb("filters"),
    columns: text().array(),
    rowCount: integer("row_count"),
    fileSize: text("file_size"),
    fileUrl: text("file_url"),
    traceId: text("trace_id").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byStatus: index("idx_export_jobs_status").on(t.status),
    byRequester: index("idx_export_jobs_requested_by").on(t.requestedBy),
  })
);

/* ------------------------------ SECURITY EVENTS --------------------------- */

export const securityEvents = pgTable("security_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  userName: text("user_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"),
  action: text("action"),
  result: text("result").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  severity: text("severity").notNull().default("info"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

/* ----------------------------- REMINDERS ---------------------------------- */

export const reminders = pgTable(
  "reminders",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    reminderType: text("reminder_type").notNull(),
    recipientId: varchar("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recipientEmail: text("recipient_email"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    scheduledDate: timestamp("scheduled_date").notNull(),
    sentDate: timestamp("sent_date"),
    status: text("status").notNull().default("pending"),
    priority: text("priority").notNull().default("normal"),
    retryCount: integer("retry_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byRecipient: index("idx_reminders_recipient").on(t.recipientId),
    bySchedule: index("idx_reminders_scheduled").on(t.scheduledDate),
  })
);

/* --------------------------- WORKFLOW DEFINITIONS ------------------------- */

export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    entityType: text("entity_type").notNull(),
    steps: jsonb("steps").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byEntityType: index("idx_wf_defs_entity").on(t.entityType),
    byActive: index("idx_wf_defs_active").on(t.isActive),
  })
);

/* ---------------------------- WORKFLOW INSTANCES -------------------------- */

export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    definitionId: varchar("definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    currentStep: integer("current_step").notNull().default(0),
    status: text("status").notNull().default("in_progress"),
    data: jsonb("data"),
    startedBy: varchar("started_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at")
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byEntity: index("idx_wf_instances_entity").on(t.entityType, t.entityId),
    byStatus: index("idx_wf_instances_status").on(t.status),
  })
);

/* ----------------------- NOTIFICATION PREFERENCES ------------------------- */

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // email, interface, teams
    alertType: text("alert_type").notNull(), // deadline, validation, workflow, sap_error, amount_change
    enabled: boolean("enabled").notNull().default(true),
    threshold: decimal("threshold", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqUserTypeChannel: uniqueIndex("ux_notif_pref_user_type_channel").on(
      t.userId,
      t.alertType,
      t.channel
    ),
  })
);

/* --------------------------- ECONOMIC INDICES (INSEE) --------------------- */

export const economicIndices = pgTable(
  "economic_indices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seriesId: text("series_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    date: timestamp("date").notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    base: text("base").notNull(),
    source: text("source").notNull().default("INSEE"),
    status: text("status").notNull().default("R"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqBySeriesDate: uniqueIndex("ux_economic_indices_series_date").on(
      t.seriesId,
      t.year,
      t.month,
      t.base,
      t.status
    ),
    byCodeDate: index("idx_economic_indices_code_date").on(
      t.code,
      t.year,
      t.month
    ),
  })
);

/* ------------------------ VALIDATION ASSIGNMENTS -------------------------- */

export const validationAssignments = pgTable(
  "validation_assignments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parkCode: text("park_code").notNull().unique(),
    businessUnit: text("business_unit").notNull(),
    mainValidatorId: varchar("main_validator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    mainValidatorName: text("main_validator_name").notNull(),
    backupValidatorId: varchar("backup_validator_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    backupValidatorName: text("backup_validator_name"),
    isActive: boolean("is_active").notNull().default(true),
    autoReminder: boolean("auto_reminder").notNull().default(true),
    reminderDelay: integer("reminder_delay").notNull().default(24),
    escalationDelay: integer("escalation_delay").notNull().default(48),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byActive: index("idx_val_assign_active").on(t.isActive),
    byBU: index("idx_val_assign_bu").on(t.businessUnit),
  })
);

/* ------------------------ INDEXATION FREQUENCIES -------------------------- */

export const indexationFrequencies = pgTable(
  "indexation_frequencies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractCode: text("contract_code").notNull().unique(),
    frequency: text("frequency").notNull(),
    scope: text("scope").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byActive: index("idx_idxfreq_active").on(t.isActive),
  })
);

/* ------------------------- SAP SYNCHRONIZATIONS --------------------------- */

export const sapSynchronizations = pgTable(
  "sap_synchronizations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractId: varchar("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    sapOrderNumber: text("sap_order_number"),
    action: text("action").notNull(), // create, update, terminate
    direction: text("direction").notNull(), // to_sap, from_sap
    status: text("status").notNull().default("pending"), // pending, processing, success, error, retry
    payload: jsonb("payload").notNull(),
    response: jsonb("response"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byContract: index("idx_sap_sync_contract").on(t.contractId),
    byStatus: index("idx_sap_sync_status").on(t.status),
  })
);

/* --------------------------- VALIDATION REMINDERS ------------------------- */

export const validationReminders = pgTable(
  "validation_reminders",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    validationRequestId: varchar("validation_request_id")
      .notNull()
      .references(() => validationRequests.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // reminder, escalation
    level: integer("level").notNull().default(1),
    sentTo: text("sent_to").notNull(), // email or userId (historique)
    sentAt: timestamp("sent_at")
      .notNull()
      .default(sql`now()`),
    nextReminderAt: timestamp("next_reminder_at"),
    status: text("status").notNull().default("sent"),
    message: text("message"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byVR: index("idx_val_reminders_vr").on(t.validationRequestId),
  })
);

/* --------------------------- STATE TRANSITION RULES ----------------------- */

export const stateTransitionRules = pgTable(
  "state_transition_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    condition: text("condition").notNull(),
    requiresValidation: boolean("requires_validation").notNull().default(false),
    autoExecute: boolean("auto_execute").notNull().default(false),
    validatorRole: text("validator_role"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    fromTo: index("idx_state_rules_from_to").on(t.fromState, t.toState),
    byActive: index("idx_state_rules_active").on(t.isActive),
  })
);

/* ------------------------------- CODE SNIPPETS ---------------------------- */

export const codeSnippets = pgTable(
  "code_snippets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description"),
    code: text("code").notNull(),
    language: text("language").notNull(),
    context: text("context"),
    contextId: varchar("context_id"),
    tags: text().array(),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sharedWith: text().array(),
    viewCount: integer("view_count").notNull().default(0),
    copyCount: integer("copy_count").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byCreator: index("idx_snippets_creator").on(t.createdBy),
    byContext: index("idx_snippets_context").on(t.context, t.contextId),
  })
);

/* =============================== RELATIONS ================================ */

export const usersRelations = relations(users, ({ many }) => ({
  createdContracts: many(contracts), // via contracts.createdBy FK
  activityLogs: many(activityLogs),
  notificationPreferences: many(notificationPreferences),
  exportJobs: many(exportJobs),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  creator: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
  validator: one(users, {
    fields: [contracts.validatedBy],
    references: [users.id],
  }),
  indexations: many(indexations),
  deadlines: many(deadlines),
  amendments: many(amendments),
  terminations: many(terminations),
  documents: many(documents),
  invoices: many(invoices),
  paymentBlocks: many(paymentBlocks),
  paymentProofs: many(paymentProofs),
  sapSyncs: many(sapSynchronizations),
  indexationProposals: many(indexationProposals),
}));

/**
 * Table des journaux d’audit (Audit Logs)
 * Suivi complet des actions utilisateurs et système sur les entités principales
 */
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  timestamp: timestamp("timestamp")
    .notNull()
    .default(sql`now()`),

  userId: varchar("user_id"), // 🔗 Optionnel : FK vers users
  username: text("username"),
  role: text("role"),

  entityType: text("entity_type").notNull(), // e.g. "contract", "amendment"
  entityId: varchar("entity_id"),
  entityNumber: text("entity_number"), // e.g. contractNumber or amendmentNumber

  action: text("action").notNull(), // create, update, delete, validate, index, etc.
  details: text("details"), // optional message

  before: jsonb("before"), // snapshot avant modification
  after: jsonb("after"), // snapshot après modification
  diff: jsonb("diff"), // différences clés calculées

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  traceId: text("trace_id"),

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const amendmentsRelations = relations(amendments, ({ one }) => ({
  contract: one(contracts, {
    fields: [amendments.contractId],
    references: [contracts.id],
  }),
  requester: one(users, {
    fields: [amendments.requestedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [amendments.approvedBy],
    references: [users.id],
  }),
}));

export const indexationsRelations = relations(indexations, ({ one }) => ({
  contract: one(contracts, {
    fields: [indexations.contractId],
    references: [contracts.id],
  }),
  validator: one(users, {
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
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const validationAssignmentsRelations = relations(
  validationAssignments,
  ({ one }) => ({
    mainValidator: one(users, {
      fields: [validationAssignments.mainValidatorId],
      references: [users.id],
    }),
    backupValidator: one(users, {
      fields: [validationAssignments.backupValidatorId],
      references: [users.id],
    }),
  })
);

export const terminationsRelations = relations(terminations, ({ one }) => ({
  contract: one(contracts, {
    fields: [terminations.contractId],
    references: [contracts.id],
  }),
  requestedBy: one(users, {
    fields: [terminations.requestedBy],
    references: [users.id],
  }),
  validatedBy: one(users, {
    fields: [terminations.validatedBy],
    references: [users.id],
  }),
  executedBy: one(users, {
    fields: [terminations.executedBy],
    references: [users.id],
  }),
}));

export const codeSnippetsRelations = relations(codeSnippets, ({ one }) => ({
  creator: one(users, {
    fields: [codeSnippets.createdBy],
    references: [users.id],
  }),
}));

/* ============================ ZOD INSERT SCHEMAS ========================== */

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertValidationRequestSchema = createInsertSchema(
  validationRequests
).omit({
  id: true,
  createdAt: true,
  age: true,
});
export const insertIndexationFormulaSchema = createInsertSchema(
  indexationFormulas
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertIndexValueSchema = createInsertSchema(indexValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertIndexationProposalSchema = createInsertSchema(
  indexationProposals
).omit({
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
  executedAt: true,
});
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
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
export const insertSecurityEventSchema = createInsertSchema(
  securityEvents
).omit({ id: true, createdAt: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertWorkflowDefinitionSchema = createInsertSchema(
  workflowDefinitions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertWorkflowInstanceSchema = createInsertSchema(
  workflowInstances
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
});
export const insertNotificationPreferenceSchema = createInsertSchema(
  notificationPreferences
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEconomicIndexSchema = createInsertSchema(
  economicIndices
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertValidationAssignmentSchema = createInsertSchema(
  validationAssignments
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertIndexationFrequencySchema = createInsertSchema(
  indexationFrequencies
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSapSynchronizationSchema = createInsertSchema(
  sapSynchronizations
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertValidationReminderSchema = createInsertSchema(
  validationReminders
).omit({
  id: true,
  createdAt: true,
});
export const insertStateTransitionRuleSchema = createInsertSchema(
  stateTransitionRules
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({
  id: true,
  viewCount: true,
  copyCount: true,
  createdAt: true,
  updatedAt: true,
});

/* ================================= TYPES ================================= */

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type ValidationRequest = typeof validationRequests.$inferSelect;
export type InsertValidationRequest = z.infer<
  typeof insertValidationRequestSchema
>;
export type IndexationFormula = typeof indexationFormulas.$inferSelect;
export type InsertIndexationFormula = z.infer<
  typeof insertIndexationFormulaSchema
>;
export type IndexValue = typeof indexValues.$inferSelect;
export type InsertIndexValue = z.infer<typeof insertIndexValueSchema>;
export type IndexationProposal = typeof indexationProposals.$inferSelect;
export type InsertIndexationProposal = z.infer<
  typeof insertIndexationProposalSchema
>;
export type Indexation = typeof indexations.$inferSelect;
export type InsertIndexation = z.infer<typeof insertIndexationSchema>;
export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type Amendment = typeof amendments.$inferSelect;
export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;
export type Termination = typeof terminations.$inferSelect;
export type InsertTermination = z.infer<typeof insertTerminationSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
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
export type InsertWorkflowDefinition = z.infer<
  typeof insertWorkflowDefinitionSchema
>;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<
  typeof insertWorkflowInstanceSchema
>;
export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<
  typeof insertNotificationPreferenceSchema
>;
export type SelectEconomicIndex = typeof economicIndices.$inferSelect;
export type InsertEconomicIndex = z.infer<typeof insertEconomicIndexSchema>;
export type SelectValidationAssignment =
  typeof validationAssignments.$inferSelect;
export type InsertValidationAssignment = z.infer<
  typeof insertValidationAssignmentSchema
>;
export type SelectIndexationFrequency =
  typeof indexationFrequencies.$inferSelect;
export type InsertIndexationFrequency = z.infer<
  typeof insertIndexationFrequencySchema
>;
export type SapSynchronization = typeof sapSynchronizations.$inferSelect;
export type InsertSapSynchronization = z.infer<
  typeof insertSapSynchronizationSchema
>;
export type ValidationReminder = typeof validationReminders.$inferSelect;
export type InsertValidationReminder = z.infer<
  typeof insertValidationReminderSchema
>;
export type StateTransitionRule = typeof stateTransitionRules.$inferSelect;
export type InsertStateTransitionRule = z.infer<
  typeof insertStateTransitionRuleSchema
>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
