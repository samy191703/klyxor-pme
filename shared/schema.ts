import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").notNull(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending_validation, active, terminated, closed
  type: text("type").notNull(),
  businessUnit: text("business_unit").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  indexationFrequency: text("indexation_frequency"), // quarterly, annual, etc.
  nextIndexationDate: timestamp("next_indexation_date"),
  createdBy: varchar("created_by").notNull(),
  validatedBy: varchar("validated_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  hasRequiredDocuments: boolean("has_required_documents").notNull().default(false),
});

// Validation requests table
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

// Indexations table
export const indexations = pgTable("indexations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  contractTitle: text("contract_title").notNull(),
  indexationDate: timestamp("indexation_date").notNull(),
  frequency: text("frequency").notNull(), // Annuelle, Trimestrielle, Semestrielle, Mensuelle
  formula: text("formula").notNull(), // ICC, ILC, IRL, BT01, FM0A, Personnalisée
  indexKey: text("index_key").notNull(), // BT01, FM0A, etc.
  source: text("source").notNull(), // INSEE, Eurostat, Banque de France
  businessUnit: text("business_unit").notNull(),
  responsible: text("responsible"),
  periodFrom: timestamp("period_from").notNull(),
  periodTo: timestamp("period_to").notNull(),
  originalIndexDate: timestamp("original_index_date"),
  revisionIndexDate: timestamp("revision_index_date"),
  indices: jsonb("indices").notNull(), // array of {code, valueN1, valueN, source, date}
  oldAmount: decimal("old_amount", { precision: 15, scale: 2 }).notNull(),
  newAmount: decimal("new_amount", { precision: 15, scale: 2 }).notNull(),
  previousAmount: decimal("previous_amount", { precision: 15, scale: 2 }),
  proposedAmount: decimal("proposed_amount", { precision: 15, scale: 2 }),
  deltaAmount: decimal("delta_amount", { precision: 15, scale: 2 }).notNull(),
  deltaPercentage: decimal("delta_percentage", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default("to_calculate"), // to_calculate, pending, validated, rejected, error, waiting_index
  assignedValidator: text("assigned_validator"),
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
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
  type: text("type").notNull(), // critical, warning, info
  category: text("category").notNull(), // sap_error, workflow_delay, deadline, validation
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
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
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type ValidationRequest = typeof validationRequests.$inferSelect;
export type InsertValidationRequest = z.infer<typeof insertValidationRequestSchema>;
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
