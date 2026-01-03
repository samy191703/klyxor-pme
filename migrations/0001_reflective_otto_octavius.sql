

CREATE TABLE "code_snippets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"code" text NOT NULL,
	"language" text NOT NULL,
	"context" text,
	"context_id" varchar,
	"tags" text[],
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" varchar NOT NULL,
	"sharedWith" text[],
	"view_count" integer DEFAULT 0 NOT NULL,
	"copy_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_indices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"date" timestamp NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"base" text NOT NULL,
	"source" text DEFAULT 'INSEE' NOT NULL,
	"status" text DEFAULT 'R' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "index_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_code" text NOT NULL,
	"index_name" text,
	"source" text NOT NULL,
	"date" timestamp NOT NULL,
	"period" timestamp,
	"publication_date" timestamp,
	"value" numeric(10, 4) NOT NULL,
	"status" text DEFAULT 'provisional' NOT NULL,
	"previous_value" numeric(10, 4),
	"variation" numeric(5, 2),
	"is_latest" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexation_frequencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_code" text NOT NULL,
	"frequency" text NOT NULL,
	"scope" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indexation_frequencies_contract_code_unique" UNIQUE("contract_code")
);
--> statement-breakpoint
CREATE TABLE "indexation_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"contract_number" text NOT NULL,
	"contract_title" text NOT NULL,
	"indexation_date" timestamp NOT NULL,
	"formula_code" text NOT NULL,
	"formula_expression" text,
	"required_indices" jsonb NOT NULL,
	"indices_values" jsonb,
	"base_amount" numeric(15, 2) NOT NULL,
	"previous_amount" numeric(15, 2),
	"calculated_amount" numeric(15, 2),
	"final_amount" numeric(15, 2),
	"delta_absolute" numeric(15, 2),
	"delta_percent" numeric(5, 2),
	"capped_applied" boolean DEFAULT false,
	"threshold_applied" boolean DEFAULT false,
	"status" text DEFAULT 'draft' NOT NULL,
	"calculation_details" jsonb,
	"validation_decision" text,
	"validation_reason" text,
	"validated_by" varchar,
	"validated_at" timestamp,
	"applied_at" timestamp,
	"error_message" text,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_by" text DEFAULT 'scheduler' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text NOT NULL,
	"period" text,
	"description" text,
	"base_amount" numeric(15, 2),
	"amount" numeric(15, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 20,
	"vat_amount" numeric(15, 2),
	"total_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"paid_amount" numeric(15, 2),
	"payment_method" text,
	"payment_reference" text,
	"indexation_applied" boolean DEFAULT false,
	"indexation_type" text,
	"indexation_rate" numeric(10, 6),
	"adjustment_amount" numeric(15, 2),
	"penalty_amount" numeric(15, 2),
	"deposit_return" numeric(15, 2),
	"consumption_estimated" numeric(15, 2),
	"consumption_actual" numeric(15, 2),
	"unit_price" numeric(10, 4),
	"is_final" boolean DEFAULT false,
	"generated_at" timestamp,
	"generated_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel" text NOT NULL,
	"alert_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"threshold" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sap_synchronizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"sap_order_number" text,
	"action" text NOT NULL,
	"direction" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"response" jsonb,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_transition_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"condition" text NOT NULL,
	"requires_validation" boolean DEFAULT false NOT NULL,
	"auto_execute" boolean DEFAULT false NOT NULL,
	"validator_role" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "validation_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_code" text NOT NULL,
	"business_unit" text NOT NULL,
	"main_validator_id" varchar NOT NULL,
	"main_validator_name" text NOT NULL,
	"backup_validator_id" varchar,
	"backup_validator_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_reminder" boolean DEFAULT true NOT NULL,
	"reminder_delay" integer DEFAULT 24 NOT NULL,
	"escalation_delay" integer DEFAULT 48 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "validation_assignments_park_code_unique" UNIQUE("park_code")
);
--> statement-breakpoint
CREATE TABLE "validation_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validation_request_id" varchar NOT NULL,
	"type" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"sent_to" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"next_reminder_at" timestamp,
	"status" text DEFAULT 'sent' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);




--> statement-breakpoint

ALTER TABLE "audit_logs" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint


ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contract_type" text,--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_name" text,--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "technology" text;--> statement-breakpoint


ALTER TABLE "contracts" ADD COLUMN "indexation_formula" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_formula_id" varchar;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_base_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_current_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_indices" jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_cap" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "indexation_threshold" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "last_indexation_date" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "index_taking_date" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "index_taking_date_rule" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "calculation_mode" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "park_code" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "tariff_tiers" jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "last_tier_change_date" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "last_tier_change_year" integer;--> statement-breakpoint
ALTER TABLE "indexation_formulas" ADD COLUMN "formula" text;--> statement-breakpoint
ALTER TABLE "indexation_formulas" ADD COLUMN "calculation_mode" text;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "park_code" text;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "index_taking_date" timestamp;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "formula_type" text;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "factor_brut" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "factor_final" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "threshold_applied" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "threshold_blocked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "cap_applied" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "calculation_details" jsonb;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "retroactivity" jsonb;--> statement-breakpoint
ALTER TABLE "indexations" ADD COLUMN "tier_change" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "keycloak_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "keycloak_sub" text;

-- 3) Coerce values BEFORE changing types / adding NOT NULL
-- Force all contract types to a valid enum label that exists
UPDATE "contracts" SET "type" = 'electricity';

-- Ensure client_name/language have defaults where missing
UPDATE "contracts" SET "client_name" = 'Client inconnu' WHERE "client_name" IS NULL;
UPDATE "contracts" SET "language" = 'FR' WHERE "language" IS NULL;

-- 4) Now it’s safe to enforce types/defaults
ALTER TABLE "contracts"
  ALTER COLUMN "client_name" SET DEFAULT 'Client inconnu',
  ALTER COLUMN "client_name" SET NOT NULL,
  ALTER COLUMN "language" SET DEFAULT 'FR',
  ALTER COLUMN "language" SET NOT NULL;

--ALTER TABLE "contracts" ALTER COLUMN "type" SET DATA TYPE contract_type USING ("type"::contract_type);--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "index_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "source" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "business_unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "period_from" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "period_to" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "indices" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indexations" ALTER COLUMN "status" SET DEFAULT 'calculated';--> statement-breakpoint