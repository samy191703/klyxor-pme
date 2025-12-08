-- Migration US8: Ajout des statuts DRAFT et ANNULEE pour les billing lines
-- Date: 2025-01-XX
-- Description: Étend les statuts disponibles pour les échéances (billing lines)

-- Step 1: Drop existing CHECK constraint if it exists
DO $$ 
BEGIN
	IF EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_lines_status'
	) THEN
		ALTER TABLE "billing_lines" 
		DROP CONSTRAINT "chk_billing_lines_status";
	END IF;
END $$;
--> statement-breakpoint

-- Step 2: Add new CHECK constraint with all 4 statuses
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_lines_status'
	) THEN
		ALTER TABLE "billing_lines" 
		ADD CONSTRAINT "chk_billing_lines_status" 
		CHECK (status IN ('DRAFT', 'A_FACTURER', 'FACTUREE', 'ANNULEE'));
	END IF;
END $$;
--> statement-breakpoint

-- Step 3: Migration des anciens statuts (si ils existent)
-- Note: Ces statuts (PENDING, INVOICED, CANCELLED) ne semblent pas exister dans le code actuel
-- mais on les inclut pour la migration documentée
DO $$ 
BEGIN
	-- PENDING -> A_FACTURER
	UPDATE "billing_lines" 
	SET status = 'A_FACTURER' 
	WHERE status = 'PENDING';
	
	-- INVOICED -> FACTUREE (si différent de FACTUREE)
	UPDATE "billing_lines" 
	SET status = 'FACTUREE' 
	WHERE status = 'INVOICED';
	
	-- CANCELLED -> ANNULEE
	UPDATE "billing_lines" 
	SET status = 'ANNULEE' 
	WHERE status = 'CANCELLED';
END $$;
--> statement-breakpoint

-- Step 4: Ensure default value is A_FACTURER (should already be set, but ensure it)
DO $$ 
BEGIN
	-- Check if default exists and update if needed
	IF EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name = 'billing_lines' 
		AND column_name = 'status'
		AND column_default IS NULL
	) THEN
		ALTER TABLE "billing_lines" 
		ALTER COLUMN "status" SET DEFAULT 'A_FACTURER';
	END IF;
END $$;
--> statement-breakpoint

