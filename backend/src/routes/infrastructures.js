const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// GET /api/infrastructures — with filters
router.get('/', async (req, res) => {
    const { type, area, risk_level, urgency, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = [];
    let params = [];
    let idx = 1;

    if (type) { whereClauses.push(`i.type = $${idx++}`); params.push(type); }
    if (area) { whereClauses.push(`i.area ILIKE $${idx++}`); params.push(`%${area}%`); }
    if (risk_level) { whereClauses.push(`rs.risk_level = $${idx++}`); params.push(risk_level); }
    if (urgency) { whereClauses.push(`bp.priority = $${idx++}`); params.push(urgency); }
    if (search) { whereClauses.push(`i.name ILIKE $${idx++}`); params.push(`%${search}%`); }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    try {
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM infrastructures i
       LEFT JOIN risk_scores rs ON rs.infrastructure_id = i.id
       LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
       ${whereSQL}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        params.push(parseInt(limit), offset);
        const result = await pool.query(
            `SELECT i.*, rs.risk_score, rs.health_score, rs.risk_level, 
              bp.estimated_cost_usd, bp.planned_year, bp.priority, bp.maintenance_type,
              p.predicted_maintenance_year, p.deterioration_rate, p.predicted_condition_rating
       FROM infrastructures i
       LEFT JOIN risk_scores rs ON rs.infrastructure_id = i.id
       LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
       LEFT JOIN ml_predictions p ON p.infrastructure_id = i.id
       ${whereSQL}
       ORDER BY rs.risk_score DESC NULLS LAST
       LIMIT $${idx++} OFFSET $${idx++}`, params
        );
        res.json({ success: true, total, page: parseInt(page), limit: parseInt(limit), data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/infrastructures/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT i.*, rs.risk_score, rs.health_score, rs.risk_level, rs.age_factor, rs.load_factor, rs.material_factor, rs.env_factor,
              bp.estimated_cost_usd, bp.planned_year, bp.priority, bp.maintenance_type, bp.cost_breakdown,
              p.predicted_maintenance_year, p.deterioration_rate, p.predicted_condition_rating, p.years_to_critical, p.model_used, p.prediction_data
       FROM infrastructures i
       LEFT JOIN risk_scores rs ON rs.infrastructure_id = i.id
       LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
       LEFT JOIN ml_predictions p ON p.infrastructure_id = i.id
       WHERE i.id = $1`, [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Infrastructure not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/infrastructures (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    const num = (v) => (v === '' || v == null) ? null : Number(v);
    const str = (v, fallback) => (v && v !== '') ? v : (fallback || null);
    const {
        name, type, area, city, state, latitude, longitude,
        age_years, construction_year, material, traffic_load, env_exposure,
        structural_condition, length_meters, width_meters, daily_traffic_count,
        description, inspector_notes,
        // Government form extra fields
        route_type, economic_importance, seismic_zone, flood_risk,
        climate_zone, annual_rainfall_mm, replacement_cost_crore,
        nearest_hospital_km, nearest_fire_station_km, military_route,
        last_inspection_date, next_inspection_due,
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO infrastructures (
                name, type, area, city, state, latitude, longitude,
                age_years, construction_year, material, traffic_load, env_exposure,
                structural_condition, length_meters, width_meters, daily_traffic_count,
                description, inspector_notes,
                route_type, economic_importance, seismic_zone, flood_risk,
                climate_zone, annual_rainfall_mm, replacement_cost_crore,
                nearest_hospital_km, nearest_fire_station_km, military_route,
                last_inspection_date, next_inspection_due
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,$10,$11,$12,
                $13,$14,$15,$16,
                $17,$18,
                $19,$20,$21,$22,
                $23,$24,$25,
                $26,$27,$28,
                $29,$30
            ) RETURNING *`,
            [
                name, type, str(area, state), str(city, area), str(state, 'India'),
                num(latitude), num(longitude),
                num(age_years), num(construction_year), material, traffic_load, env_exposure,
                num(structural_condition), num(length_meters), num(width_meters), num(daily_traffic_count),
                description || null, inspector_notes || null,
                str(route_type, 'national_highway'), str(economic_importance, 'medium'),
                str(seismic_zone, 'II'), str(flood_risk, 'low'),
                str(climate_zone, 'tropical'), num(annual_rainfall_mm), num(replacement_cost_crore),
                num(nearest_hospital_km), num(nearest_fire_station_km), military_route === true || military_route === 'true' ? true : false,
                last_inspection_date || null, next_inspection_due || null,
            ]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// POST /api/infrastructures/:id/predict — run ML prediction and store
router.post('/:id/predict', async (req, res) => {
    try {
        const infra = await pool.query('SELECT * FROM infrastructures WHERE id = $1', [req.params.id]);
        if (!infra.rows[0]) return res.status(404).json({ error: 'Infrastructure not found' });
        const inf = infra.rows[0];

        // Parse stored description JSON for extra govt fields
        let meta = {};
        try { meta = JSON.parse(inf.description || '{}'); } catch { }

        // Build full 20-feature government-grade ML payload
        const mlPayload = {
            // Core
            age: inf.age_years,
            traffic_load: inf.traffic_load,
            material: inf.material,
            env_exposure: inf.env_exposure,
            structural_condition: parseFloat(inf.structural_condition),
            area_sqft: (inf.length_meters || 100) * (inf.width_meters || 10) * 10.764,
            model_type: req.body.model_type || 'random_forest',
            // Climate / disaster
            climate_zone: inf.climate_zone || 'tropical',
            flood_risk: inf.flood_risk || 'medium',
            seismic_zone: inf.seismic_zone || 'II',
            annual_rainfall_mm: inf.annual_rainfall_mm || 700,
            // Government form — structure info
            structure_type: inf.type || 'bridge',
            route_type: inf.route_type || 'national_highway',
            // Structural dimensions
            num_spans: inf.num_spans || meta.num_spans || 1,
            design_life: inf.design_life || meta.design_life || 70,
            num_lanes: inf.num_lanes || meta.num_lanes || 2,
            length_m: inf.length_meters || null,
            width_m: inf.width_meters || null,
            // Structural type fields (from description/metadata)
            superstructure_type: inf.superstructure_type || meta.superstructure || null,
            foundation_type: inf.foundation_type || meta.foundation || null,
            scour_risk: inf.scour_risk != null ? parseFloat(inf.scour_risk) : 0.0,
            coastal_exposure: inf.coastal_exposure != null ? parseFloat(inf.coastal_exposure) : 0.0,
            // Inspection
            major_defect: inf.major_defect || meta.defects?.split(',')[0]?.trim().toLowerCase().replace(' ', '_') || 'none',
            // Road-specific
            pci: inf.pci != null ? parseFloat(inf.pci) : null,
            pavement_type: inf.pavement_type || null,
            // Tunnel-specific
            safety_score: inf.safety_score != null ? parseFloat(inf.safety_score) : null,
            // Traffic
            aadt: inf.daily_traffic_count || null,
        };

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, mlPayload);
        const prediction = mlResponse.data.data;
        const conf = prediction.confidence || {};

        await pool.query(
            `INSERT INTO ml_predictions
               (infrastructure_id, predicted_condition_rating, predicted_maintenance_year,
                deterioration_rate, years_to_critical, model_used, prediction_data)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (infrastructure_id) DO UPDATE SET
               predicted_condition_rating = EXCLUDED.predicted_condition_rating,
               predicted_maintenance_year = EXCLUDED.predicted_maintenance_year,
               deterioration_rate         = EXCLUDED.deterioration_rate,
               years_to_critical          = EXCLUDED.years_to_critical,
               model_used                 = EXCLUDED.model_used,
               prediction_data            = EXCLUDED.prediction_data,
               predicted_at               = NOW()`,
            [req.params.id,
            prediction.predicted_condition_rating,
            prediction.predicted_maintenance_year,
            prediction.deterioration_rate,
            prediction.years_to_critical,
            prediction.model_used,
            JSON.stringify(prediction)]
        );

        // ── Write risk_scores (DELETE + INSERT — reliable vs ON CONFLICT) ──────
        const rs = parseFloat(prediction.risk_score) || 0;
        const hs = parseFloat(prediction.health_score) || Math.max(0, 100 - rs);
        const rl = prediction.risk_level
            || (rs >= 75 ? 'critical' : rs >= 50 ? 'high' : rs >= 25 ? 'moderate' : 'low');
        const fb = prediction.factor_breakdown || {};

        await pool.query('DELETE FROM risk_scores WHERE infrastructure_id = $1', [req.params.id]);
        await pool.query(
            `INSERT INTO risk_scores
               (infrastructure_id, risk_score, health_score, risk_level,
                age_factor, load_factor, material_factor, env_factor, climate_factor,
                composite_priority_score, calculated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())`,
            [req.params.id, rs, hs, rl,
            fb.age_factor || null,
            fb.load_factor || null,
            fb.material_factor || null,
            fb.env_factor || null,
            prediction.climate_factor || null,
                rs]
        );

        // ── Store budget from ML service (unique per structure based on area & risk) ──
        // NOTE: enum values must match schema CHECK constraints exactly
        const mlBudget = prediction.budget_estimate || {};
        // estimated_cost_usd comes from ML: area_sqft * cost_per_sqft (unique per structure)
        const budgetUSD = mlBudget.estimated_cost_usd || (rs >= 75 ? 5000000 : rs >= 50 ? 2500000 : rs >= 25 ? 800000 : 200000);
        const inrCrore = mlBudget.estimated_cost_inr_crore || null;
        // Map ML maintenance_type ('replacement','major_repair','preventive','routine') → already valid enum values
        const maintType = mlBudget.maintenance_type || (rs >= 75 ? 'major_repair' : rs >= 50 ? 'preventive' : 'routine');
        const priority = rs >= 75 ? 'urgent' : rs >= 50 ? 'high' : 'medium';
        const plannedYear = mlBudget.planned_year
            || Math.max(new Date().getFullYear(), parseInt(prediction.predicted_maintenance_year) || new Date().getFullYear());
        await pool.query(
            `INSERT INTO budget_plans
               (infrastructure_id, estimated_cost_usd, estimated_cost_inr_crore, maintenance_type, priority, planned_year)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (infrastructure_id)
             DO UPDATE SET
               estimated_cost_usd       = EXCLUDED.estimated_cost_usd,
               estimated_cost_inr_crore = EXCLUDED.estimated_cost_inr_crore,
               maintenance_type         = EXCLUDED.maintenance_type,
               priority                 = EXCLUDED.priority,
               planned_year             = EXCLUDED.planned_year`,
            [req.params.id, budgetUSD, inrCrore, maintType, priority, plannedYear]
        );

        res.json({ success: true, data: prediction });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/infrastructures/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const existing = await pool.query('SELECT id, name FROM infrastructures WHERE id = $1', [req.params.id]);
        if (!existing.rows[0]) return res.status(404).json({ error: 'Infrastructure not found' });
        // CASCADE will delete risk_scores, ml_predictions, budget_plans, sensor_readings
        await pool.query('DELETE FROM infrastructures WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: `Deleted: ${existing.rows[0].name}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    const { name, type, area, age_years, material, traffic_load, env_exposure, structural_condition, description, inspector_notes, last_inspection_date } = req.body;
    try {
        const result = await pool.query(
            `UPDATE infrastructures SET name=$1, type=$2, area=$3, age_years=$4, material=$5, traffic_load=$6, env_exposure=$7, structural_condition=$8, description=$9, inspector_notes=$10, last_inspection_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
            [name, type, area, age_years, material, traffic_load, env_exposure, structural_condition, description, inspector_notes, last_inspection_date, req.params.id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
