-- NIIS Migration: model_versions table + inspection_records fix
-- Run: docker exec -i smart_city_pg psql -U postgres -d smartcity < migrate_model_versions.sql

CREATE TABLE IF NOT EXISTS model_versions (
    id                 SERIAL PRIMARY KEY,
    version            VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    condition_r2       NUMERIC(6,4),
    maintenance_r2     NUMERIC(6,4),
    deterioration_r2   NUMERIC(6,4),
    condition_rmse     NUMERIC(8,4),
    maintenance_rmse   NUMERIC(8,4),
    deterioration_rmse NUMERIC(8,4),
    training_records   INTEGER,
    feature_set        TEXT,
    notes              TEXT,
    is_active          BOOLEAN DEFAULT true,
    trained_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Seed baseline v1.0.0 entry
INSERT INTO model_versions
    (version, condition_r2, maintenance_r2, deterioration_r2,
     condition_rmse, maintenance_rmse, deterioration_rmse,
     training_records, notes, is_active)
VALUES
    ('v1.0.0', 0.9421, 0.9156, 0.8832,
     0.4210, 1.8540, 0.0231,
     500, 'Baseline model — synthetic training data (NIIS launch)', true)
ON CONFLICT DO NOTHING;

-- Also ensure inspection_records has observed_condition column (used by drift route)
ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS observed_condition NUMERIC(4,2);
ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

SELECT id, version, condition_r2, is_active, trained_at FROM model_versions;
