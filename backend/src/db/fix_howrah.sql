-- Add unique constraint on risk_scores.infrastructure_id for ON CONFLICT upsert
ALTER TABLE risk_scores ADD CONSTRAINT IF NOT EXISTS risk_scores_infra_unique UNIQUE (infrastructure_id);

-- Fix Howrah Bridge ID=76 with correct government form data
UPDATE infrastructures SET
    state              = 'West Bengal',
    city               = 'Kolkata',
    material           = 'steel',
    traffic_load       = 'extreme',
    env_exposure       = 'severe',
    seismic_zone       = 'III',
    flood_risk         = 'high',
    climate_zone       = 'coastal',
    annual_rainfall_mm = 1600,
    route_type         = 'national_highway',
    economic_importance= 'critical',
    replacement_cost_crore = 48.0,
    last_inspection_date   = '2025-01-15',
    next_inspection_due    = '2026-01-01',
    age_years          = 90
WHERE id = 76;

-- Verify
SELECT id, name, state, material, traffic_load, env_exposure,
       seismic_zone, flood_risk, last_inspection_date, replacement_cost_crore
FROM infrastructures WHERE id = 76;
