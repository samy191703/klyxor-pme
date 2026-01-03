-- Migration: Add billing period dates and invoice date to billing_lines
-- This migration adds three new columns to billing_lines:
--   - billing_start_date: Date de début de la période de facturation
--   - billing_end_date: Date de fin de la période de facturation
--   - invoice_date: Date de génération de la facture (nullable)

-- Add billing_start_date column if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'billing_start_date'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD COLUMN "billing_start_date" timestamp;
	END IF;
END $$;
--> statement-breakpoint

-- Add billing_end_date column if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'billing_end_date'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD COLUMN "billing_end_date" timestamp;
	END IF;
END $$;
--> statement-breakpoint

-- Add invoice_date column if it doesn't exist
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'invoice_date'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD COLUMN "invoice_date" timestamp;
	END IF;
END $$;
--> statement-breakpoint

-- Make billing_start_date and billing_end_date NOT NULL after migration
-- First, we need to populate existing rows with default values
-- For existing rows, we'll use due_date as a fallback (can be updated later)
DO $$ 
BEGIN
	-- Update existing rows: set billing_start_date and billing_end_date to due_date if NULL
	-- This is a safe default that preserves existing data
	UPDATE "billing_lines" 
	SET 
		"billing_start_date" = COALESCE("billing_start_date", "due_date"),
		"billing_end_date" = COALESCE("billing_end_date", "due_date")
	WHERE "billing_start_date" IS NULL OR "billing_end_date" IS NULL;
	
	-- Now make them NOT NULL if they are still nullable
	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'billing_start_date'
		AND is_nullable = 'YES'
	) THEN
		ALTER TABLE "billing_lines" 
		ALTER COLUMN "billing_start_date" SET NOT NULL;
	END IF;
	
	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'billing_end_date'
		AND is_nullable = 'YES'
	) THEN
		ALTER TABLE "billing_lines" 
		ALTER COLUMN "billing_end_date" SET NOT NULL;
	END IF;
END $$;
--> statement-breakpoint

-- Add indexes for the new date columns to improve query performance
CREATE INDEX IF NOT EXISTS "idx_billing_lines_billing_start_date" ON "billing_lines" ("billing_start_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_billing_end_date" ON "billing_lines" ("billing_end_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_invoice_date" ON "billing_lines" ("invoice_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_lines_billing_period" ON "billing_lines" ("billing_start_date", "billing_end_date");
--> statement-breakpoint


