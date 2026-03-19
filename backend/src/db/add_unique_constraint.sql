DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='risk_scores_infra_unique'
  ) THEN
    ALTER TABLE risk_scores ADD CONSTRAINT risk_scores_infra_unique UNIQUE (infrastructure_id);
  END IF;
END
$migration$;
SELECT 'DONE';
