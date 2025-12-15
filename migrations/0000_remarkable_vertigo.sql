CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_reference" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"category" text,
	"title" text,
	"message" text NOT NULL,
	"contract_number" text,
	"send_status" text DEFAULT 'pending' NOT NULL,
	"read_status" boolean DEFAULT false NOT NULL,
	"channel" text DEFAULT 'in-app' NOT NULL,
	"user_id" varchar,
	"reference_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amendments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"number" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"effective_date" timestamp NOT NULL,
	"original_amount" numeric(15, 2),
	"new_amount" numeric(15, 2),
	"impact_description" text,
	"requested_by" varchar NOT NULL,
	"approved_by" varchar,
	"signed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amendments_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user" text NOT NULL,
	"action" text NOT NULL,
	"fields" text,
	"before" text,
	"after" text,
	"trace_id" text NOT NULL,
	"contract_number" text,
	"description" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"type" text NOT NULL,
	"business_unit" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"indexation_frequency" text,
	"next_indexation_date" timestamp,
	"created_by" varchar NOT NULL,
	"validated_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"has_required_documents" boolean DEFAULT false NOT NULL,
	CONSTRAINT "contracts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"contract_number" text NOT NULL,
	"type" text NOT NULL,
	"date" timestamp NOT NULL,
	"days_remaining" integer NOT NULL,
	"business_unit" text NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"tags" text[],
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"retention_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"requested_by" varchar NOT NULL,
	"filters" jsonb,
	"columns" text[],
	"row_count" integer,
	"file_size" text,
	"file_url" text,
	"trace_id" text NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"author" text NOT NULL,
	"status" text NOT NULL,
	"total_rows" integer NOT NULL,
	"success_rows" integer NOT NULL,
	"error_rows" integer NOT NULL,
	"error_report" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexation_formulas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"expression" text NOT NULL,
	"variables" text[] NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indexation_formulas_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "indexations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"contract_number" text NOT NULL,
	"contract_title" text NOT NULL,
	"indexation_date" timestamp NOT NULL,
	"frequency" text NOT NULL,
	"formula" text NOT NULL,
	"index_key" text NOT NULL,
	"source" text NOT NULL,
	"business_unit" text NOT NULL,
	"responsible" text,
	"period_from" timestamp NOT NULL,
	"period_to" timestamp NOT NULL,
	"original_index_date" timestamp,
	"revision_index_date" timestamp,
	"indices" jsonb NOT NULL,
	"old_amount" numeric(15, 2) NOT NULL,
	"new_amount" numeric(15, 2) NOT NULL,
	"previous_amount" numeric(15, 2),
	"proposed_amount" numeric(15, 2),
	"delta_amount" numeric(15, 2) NOT NULL,
	"delta_percentage" numeric(5, 2) NOT NULL,
	"status" text DEFAULT 'to_calculate' NOT NULL,
	"assigned_validator" text,
	"validated_by" varchar,
	"validated_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" varchar NOT NULL,
	"contract_id" varchar NOT NULL,
	"contract_name" text NOT NULL,
	"amount_before" numeric(15, 2) NOT NULL,
	"amount_after" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"block_date" timestamp DEFAULT now() NOT NULL,
	"modified_by" varchar NOT NULL,
	"decision_maker" varchar,
	"decision_status" text DEFAULT 'to_validate' NOT NULL,
	"reason" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" varchar NOT NULL,
	"invoice_id" varchar NOT NULL,
	"invoice_number" text NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"method" text NOT NULL,
	"beneficiary" text NOT NULL,
	"proof_available" boolean DEFAULT false NOT NULL,
	"proof_url" text,
	"last_sent" timestamp,
	"sentTo" text[],
	"contract_id" varchar NOT NULL,
	"contract_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"reminder_type" text NOT NULL,
	"recipient_id" varchar NOT NULL,
	"recipient_email" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"sent_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" varchar,
	"user_name" text,
	"ip_address" text,
	"user_agent" text,
	"resource" text,
	"action" text,
	"result" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"severity" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"number" text NOT NULL,
	"reason" text NOT NULL,
	"type" text NOT NULL,
	"effective_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notice_date" timestamp,
	"compensation_amount" numeric(15, 2),
	"description" text,
	"requested_by" varchar NOT NULL,
	"validated_by" varchar,
	"validated_at" timestamp,
	"executed_by" varchar,
	"executed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "terminations_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "validation_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"reference_id" varchar NOT NULL,
	"reference" text NOT NULL,
	"subject" text NOT NULL,
	"requested_by" varchar NOT NULL,
	"assigned_to" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"age" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"steps" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"data" jsonb,
	"started_by" varchar NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
