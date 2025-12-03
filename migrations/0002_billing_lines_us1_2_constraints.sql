-- Migration: Add billing_lines table and constraints
-- This migration creates the billing_lines table if it doesn't exist,
-- updates the amount_ht precision, and adds CHECK constraints

-- Create billing_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS "billing_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"frequency" text NOT NULL,
	"billing_type" text NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create billing_lines table if it doesn't exist
CREATE TABLE IF NOT EXISTS "billing_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar NOT NULL,
	"sequence_no" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"amount_ht" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'A_FACTURER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraint for billing_schedules if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'billing_schedules_contract_id_contracts_id_fk'
	) THEN
		ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_contract_id_contracts_id_fk" 
		FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade;
	END IF;
END $$;
--> statement-breakpoint

-- Add foreign key constraint for billing_lines if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'billing_lines_schedule_id_billing_schedules_id_fk'
	) THEN
		ALTER TABLE "billing_lines" ADD CONSTRAINT "billing_lines_schedule_id_billing_schedules_id_fk" 
		FOREIGN KEY ("schedule_id") REFERENCES "billing_schedules"("id") ON DELETE cascade;
	END IF;
END $$;
--> statement-breakpoint

-- Create unique index on (schedule_id, due_date) if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_lines_schedule_duedate" ON "billing_lines" ("schedule_id", "due_date");
--> statement-breakpoint

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_billing_schedules_contract" ON "billing_schedules" ("contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_schedules_status" ON "billing_schedules" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_schedules_dates" ON "billing_schedules" ("start_date", "end_date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_schedules_contract_version" ON "billing_schedules" ("contract_id", "version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_schedule" ON "billing_lines" ("schedule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_duedate" ON "billing_lines" ("due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_schedule_duedate" ON "billing_lines" ("schedule_id", "due_date");
--> statement-breakpoint

-- Alter amount_ht column precision if table exists and column has different precision
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_lines') THEN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'billing_lines' 
			AND column_name = 'amount_ht' 
			AND numeric_precision != 14
		) THEN
			ALTER TABLE "billing_lines" ALTER COLUMN "amount_ht" TYPE numeric(14, 2);
		END IF;
	END IF;
END $$;
--> statement-breakpoint

-- Add CHECK constraint for amount_ht >= 0
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_lines_amount_positive'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD CONSTRAINT "chk_billing_lines_amount_positive" 
		CHECK (amount_ht >= 0);
	END IF;
END $$;
--> statement-breakpoint

-- Add CHECK constraint for status validation
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_lines_status'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD CONSTRAINT "chk_billing_lines_status" 
		CHECK (status IN ('A_FACTURER', 'FACTUREE'));
	END IF;
END $$;

