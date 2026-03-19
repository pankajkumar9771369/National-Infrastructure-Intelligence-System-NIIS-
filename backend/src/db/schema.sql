-- Smart City Infrastructure Risk Dashboard - Database Schema (NIIS v2)
-- National Infrastructure Intelligence System

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    full_name VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Infrastructure ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infrastructures (
    id SERIAL PRIMARY KEY,
    -- Identity
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bridge', 'road', 'overpass', 'tunnel', 'flyover')),
    area VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Bangalore',
    state VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    -- Engineering
    age_years INTEGER NOT NULL,
    construction_year INTEGER NOT NULL,
    material VARCHAR(50) NOT NULL CHECK (material IN ('concrete', 'steel', 'composite', 'masonry', 'asphalt')),
    traffic_load VARCHAR(20) NOT NULL CHECK (traffic_load IN ('light', 'medium', 'heavy', 'extreme')),
    env_exposure VARCHAR(20) NOT NULL CHECK (env_exposure IN ('low', 'medium', 'high', 'severe')),
    structural_condition DECIMAL(4,2) NOT NULL CHECK (structural_condition BETWEEN 0 AND 10),
    length_meters DECIMAL(10, 2),
    width_meters DECIMAL(8, 2),
    daily_traffic_count INTEGER,
    -- National-level fields (NIIS)
    route_type VARCHAR(50) DEFAULT 'city' CHECK (route_type IN ('national_highway', 'state_highway', 'district_road', 'city', 'expressway')),
    economic_importance VARCHAR(20) DEFAULT 'medium' CHECK (economic_importance IN ('critical', 'high', 'medium', 'low')),
    nearest_hospital_km DECIMAL(6,2),        -- Emergency access criticality
    nearest_fire_station_km DECIMAL(6,2),
    climate_zone VARCHAR(30) DEFAULT 'tropical', -- tropical/arid/semi-arid/coastal/highland
    annual_rainfall_mm INTEGER,               -- Climate adaptive input
    flood_risk VARCHAR(20) DEFAULT 'low' CHECK (flood_risk IN ('very_high', 'high', 'medium', 'low', 'negligible')),
    seismic_zone VARCHAR(10) DEFAULT 'II',   -- BIS IS-1893 zones: II, III, IV, V
    military_route BOOLEAN DEFAULT FALSE,     -- Strategic importance
    replacement_cost_crore DECIMAL(10,2),    -- Estimated full replacement cost (INR Crore)
    -- Inspection
    last_inspection_date DATE,
    next_inspection_due DATE,
    description TEXT,
    inspector_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Risk Scores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    infrastructure_id INTEGER REFERENCES infrastructures(id) ON DELETE CASCADE,
    risk_score DECIMAL(5, 2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    health_score DECIMAL(5, 2) NOT NULL CHECK (health_score BETWEEN 0 AND 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    -- Factor breakdown (for traceability / accountability)
    age_factor DECIMAL(4, 3),
    load_factor DECIMAL(4, 3),
    material_factor DECIMAL(4, 3),
    env_factor DECIMAL(4, 3),
    climate_factor DECIMAL(4, 3) DEFAULT 0,
    economic_weight DECIMAL(4, 3) DEFAULT 1,  -- Multiplier for economic importance
    composite_priority_score DECIMAL(6,2),    -- Final policy-grade priority
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ML Predictions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    infrastructure_id INTEGER UNIQUE REFERENCES infrastructures(id) ON DELETE CASCADE,
    predicted_condition_rating DECIMAL(4, 2),
    predicted_maintenance_year INTEGER,
    deterioration_rate DECIMAL(6, 4),
    years_to_critical DECIMAL(6, 2),
    confidence_score DECIMAL(4, 3),           -- Prediction confidence (0-1)
    model_version_id INTEGER,                 -- FK to model_versions
    model_used VARCHAR(50),
    prediction_data JSONB,
    predicted_at TIMESTAMP DEFAULT NOW()
);

-- ─── Model Versions (Pillar 3: Traceability) ─────────────────
CREATE TABLE IF NOT EXISTS model_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,             -- e.g. "v1.2.0"
    condition_r2 DECIMAL(5, 4),
    maintenance_r2 DECIMAL(5, 4),
    deterioration_r2 DECIMAL(5, 4),
    condition_rmse DECIMAL(8, 4),
    maintenance_rmse DECIMAL(8, 4),
    deterioration_rmse DECIMAL(8, 4),
    training_records INTEGER,
    feature_set JSONB,                        -- Which features were used
    notes TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    trained_at TIMESTAMP DEFAULT NOW()
);

-- ─── Inspection Records (Pillar 3: Accountability) ───────────
CREATE TABLE IF NOT EXISTS inspection_records (
    id SERIAL PRIMARY KEY,
    infrastructure_id INTEGER REFERENCES infrastructures(id) ON DELETE CASCADE,
    inspector_id INTEGER REFERENCES users(id),
    inspection_date DATE NOT NULL,
    observed_condition DECIMAL(4,2) CHECK (observed_condition BETWEEN 0 AND 10),
    observed_risk_level VARCHAR(20) CHECK (observed_risk_level IN ('low', 'moderate', 'high', 'critical')),
    inspection_type VARCHAR(30) DEFAULT 'routine' CHECK (inspection_type IN ('routine', 'emergency', 'post_disaster', 'annual')),
    findings TEXT,
    recommendations TEXT,
    photos JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Budget Plans ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_plans (
    id SERIAL PRIMARY KEY,
    infrastructure_id INTEGER REFERENCES infrastructures(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('routine', 'preventive', 'major_repair', 'replacement')),
    estimated_cost_usd DECIMAL(15, 2),
    estimated_cost_inr_crore DECIMAL(10, 4),  -- INR for government presentation
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    planned_year INTEGER,
    risk_reduction_points DECIMAL(5,2),       -- Expected risk score drop after this work
    cost_breakdown JSONB,
    optimization_run_id VARCHAR(50),          -- Links to LP optimizer run
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Budget Optimization Runs (Pillar 2: Decision Intelligence) ──
CREATE TABLE IF NOT EXISTS optimization_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(50) UNIQUE NOT NULL,
    budget_inr_crore DECIMAL(10,2) NOT NULL,
    total_structures_considered INTEGER,
    structures_selected INTEGER,
    total_risk_before DECIMAL(8,2),
    total_risk_after DECIMAL(8,2),
    risk_reduction_percent DECIMAL(5,2),
    total_cost_inr_crore DECIMAL(10,2),
    constraints JSONB,                        -- What constraints were applied
    selected_structure_ids JSONB,             -- Which were selected
    run_at TIMESTAMP DEFAULT NOW(),
    run_by INTEGER REFERENCES users(id)
);

-- ─── Sensor Readings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    infrastructure_id INTEGER REFERENCES infrastructures(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50),
    value DECIMAL(10, 4),
    unit VARCHAR(20),
    timestamp TIMESTAMP DEFAULT NOW(),
    is_anomaly BOOLEAN DEFAULT FALSE
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_infra_type ON infrastructures(type);
CREATE INDEX IF NOT EXISTS idx_infra_area ON infrastructures(area);
CREATE INDEX IF NOT EXISTS idx_infra_city ON infrastructures(city);
CREATE INDEX IF NOT EXISTS idx_infra_state ON infrastructures(state);
CREATE INDEX IF NOT EXISTS idx_infra_route_type ON infrastructures(route_type);
CREATE INDEX IF NOT EXISTS idx_infra_economic ON infrastructures(economic_importance);
CREATE INDEX IF NOT EXISTS idx_risk_infrastructure ON risk_scores(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_ml_infrastructure ON ml_predictions(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_budget_infrastructure ON budget_plans(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_sensor_infrastructure ON sensor_readings(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_sensor_timestamp ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_inspection_infrastructure ON inspection_records(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_inspection_date ON inspection_records(inspection_date);

-- ─── Model Versions (Phase 2: Retraining Engine) ─────────────
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

-- Baseline model version (seeded at launch)
INSERT INTO model_versions
    (version, condition_r2, maintenance_r2, deterioration_r2,
     condition_rmse, maintenance_rmse, deterioration_rmse,
     training_records, notes, is_active)
VALUES
    ('v1.0.0', 0.9421, 0.9156, 0.8832,
     0.4210, 1.8540, 0.0231,
     500, 'Baseline model — synthetic training data (NIIS launch)', true)
ON CONFLICT DO NOTHING;

-- Phase 2: Drift Detection — add columns to inspection_records
ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS observed_condition NUMERIC(4,2);
ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_model_versions_active ON model_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_model_versions_trained ON model_versions(trained_at);

