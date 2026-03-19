-- Direct fix for Howrah Bridge ID=76: insert correct risk_scores + budget_plans
-- Values from the confirmed ML prediction run: risk=78.79, health=21.21, level=critical

-- Clear any old rows
DELETE FROM risk_scores WHERE infrastructure_id = 76;
DELETE FROM budget_plans WHERE infrastructure_id = 76;

-- Insert correct risk score data
INSERT INTO risk_scores
  (infrastructure_id, risk_score, health_score, risk_level,
   age_factor, load_factor, material_factor, env_factor, climate_factor,
   composite_priority_score, calculated_at)
VALUES
  (76, 78.79, 21.21, 'critical',
   0.600, 1.000, 0.300, 1.000, 0.176,
   78.79, NOW());

-- Insert budget plan (critical = major_rehabilitation)
INSERT INTO budget_plans
  (infrastructure_id, estimated_cost_usd, maintenance_type, priority, planned_year)
VALUES
  (76, 5000000, 'major_rehabilitation', 'critical', 2025);

-- Verify everything
SELECT 'RISK_SCORES' as tbl, infrastructure_id, risk_score, health_score, risk_level FROM risk_scores WHERE infrastructure_id=76
UNION ALL SELECT 'BUDGET' as tbl, infrastructure_id, estimated_cost_usd, NULL, maintenance_type FROM budget_plans WHERE infrastructure_id=76;
