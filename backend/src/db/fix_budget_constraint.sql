-- Migration: Add UNIQUE constraint on budget_plans(infrastructure_id)
-- Required for ON CONFLICT (infrastructure_id) upsert in /predict route
-- Run once against your PostgreSQL database.

DO $migration$
BEGIN
  -- Step 1: Remove any duplicate budget_plans rows per infrastructure
  -- Keep only the most recently created row per infrastructure_id
  DELETE FROM budget_plans
  WHERE id NOT IN (
    SELECT MAX(id)
    FROM budget_plans
    GROUP BY infrastructure_id
  );

  -- Step 2: Add the UNIQUE constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_plans_infra_unique'
  ) THEN
    ALTER TABLE budget_plans
      ADD CONSTRAINT budget_plans_infra_unique UNIQUE (infrastructure_id);
  END IF;
END
$migration$;

SELECT 'Migration complete: budget_plans_infra_unique constraint added.' AS result;
