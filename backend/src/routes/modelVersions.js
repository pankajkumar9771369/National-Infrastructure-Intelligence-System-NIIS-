/**
 * NIIS Model Versions & Retraining Route
 * 
 * GET  /api/model-versions       — list all model versions (from DB)
 * GET  /api/model-versions/latest — latest active version with metrics
 * POST /api/model-versions/retrain — trigger ML retraining
 * POST /api/model-versions/drift  — compute drift from predictions vs inspections
 * POST /api/data/ingest           — upload + parse real NHAI CSV data
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';


// ─── GET /api/model-versions ─────────────────────────────────
router.get('/', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT id, version, condition_r2, maintenance_r2, deterioration_r2,
                condition_rmse, maintenance_rmse, deterioration_rmse,
                training_records, feature_set, notes, is_active, trained_at
         FROM model_versions ORDER BY trained_at DESC LIMIT 20`
    );
    res.json({ success: true, data: rows });
});

// ─── GET /api/model-versions/latest ──────────────────────────
router.get('/latest', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT * FROM model_versions WHERE is_active = true ORDER BY trained_at DESC LIMIT 1`
    );
    // Also pull live metrics from ML service
    let liveMetrics = null;
    try {
        const r = await axios.get(`${ML_URL}/drift-report`, { timeout: 5000 });
        liveMetrics = r.data?.data || null;
    } catch (_) { /* ML might be restarting */ }

    res.json({
        success: true,
        data: {
            db_version: rows[0] || null,
            live_metrics: liveMetrics,
        }
    });
});

// ─── POST /api/model-versions/retrain (admin only) ───────────
router.post('/retrain', authenticate, requireAdmin, async (req, res) => {
    const { trigger = 'manual', notes = '' } = req.body;
    try {
        // Call ML service to retrain
        const r = await axios.post(`${ML_URL}/retrain`, { trigger, notes }, { timeout: 300000 });
        const report = r.data?.data;

        if (!report) return res.status(502).json({ error: 'ML service returned no data' });

        // Save new version to DB
        const composite_r2 = report.new_composite_r2;
        const m = report.metrics || {};
        const { rows: [newVersion] } = await pool.query(
            `INSERT INTO model_versions
             (version, condition_r2, maintenance_r2, deterioration_r2,
              condition_rmse, maintenance_rmse, deterioration_rmse,
              training_records, notes, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [
                report.version,
                m.condition?.rf?.r2 || 0,
                m.maintenance?.rf?.r2 || 0,
                m.deterioration?.rf?.r2 || 0,
                m.condition?.rf?.rmse || 0,
                m.maintenance?.rf?.rmse || 0,
                m.deterioration?.rf?.rmse || 0,
                report.training_records,
                `${notes || trigger} | Source: ${report.data_source}`,
                report.auto_promoted,
            ]
        );

        // If promoted, deactivate old active version
        if (report.auto_promoted) {
            await pool.query(
                `UPDATE model_versions SET is_active = false WHERE is_active = true AND id != $1`,
                [newVersion.id]
            );
        }

        res.json({ success: true, data: { ...report, db_record: newVersion } });
    } catch (err) {
        console.error('Retrain error:', err.message);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

// ─── POST /api/model-versions/drift ──────────────────────────
router.post('/drift', authenticate, async (req, res) => {
    try {
        // Fetch latest predictions from DB
        const { rows: predictions } = await pool.query(
            `SELECT infrastructure_id, predicted_condition_rating
             FROM ml_predictions ORDER BY created_at DESC LIMIT 200`
        );
        // Fetch recent inspections
        const { rows: inspections } = await pool.query(
            `SELECT infrastructure_id, observed_condition FROM inspection_records
             WHERE verified = true ORDER BY inspection_date DESC LIMIT 100`
        );

        const r = await axios.post(
            `${ML_URL}/drift-report`,
            { predictions, inspections },
            { timeout: 30000 }
        );
        res.json({ success: true, data: r.data?.data });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

// ─── POST /api/data/ingest (admin — upload real data CSV body) ─
router.post('/ingest', authenticate, requireAdmin, async (req, res) => {
    /**
     * Body: { records: [...parsed NHAI records...], dry_run: false }
     * Records come pre-parsed from parse_nhai.py run on server or by client.
     */
    const { records = [], dry_run = false } = req.body;
    if (!records.length) return res.status(400).json({ error: 'No records provided' });

    try {
        const r = await axios.post(
            `${ML_URL}/ingest/nhai-csv`,
            { records, dry_run },
            { timeout: 60000 }
        );
        const report = r.data?.data;

        // If not dry_run, also insert valid records into DB infrastructures table
        if (!dry_run && report?.valid_records?.length) {
            let inserted = 0;
            for (const rec of report.valid_records) {
                try {
                    await pool.query(
                        `INSERT INTO infrastructures
                         (name, type, area, city, state, latitude, longitude, age_years,
                          construction_year, material, traffic_load, env_exposure,
                          structural_condition, length_meters, width_meters,
                          route_type, economic_importance, nearest_hospital_km,
                          climate_zone, seismic_zone, flood_risk, annual_rainfall_mm,
                          replacement_cost_crore, description)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                                 $16,$17,$18,$19,$20,$21,$22,$23,$24)
                         ON CONFLICT DO NOTHING`,
                        [
                            rec.name, rec.type || 'bridge', rec.city, rec.city, rec.state,
                            rec.latitude, rec.longitude, rec.age_years,
                            rec.construction_year, rec.material, rec.traffic_load, rec.env_exposure,
                            rec.structural_condition, rec.length_meters, rec.width_meters,
                            rec.route_type, rec.economic_importance, rec.nearest_hospital_km,
                            rec.climate_zone, rec.seismic_zone, rec.flood_risk, rec.annual_rainfall_mm,
                            rec.replacement_cost_crore, rec.description,
                        ]
                    );
                    inserted++;
                } catch (e) { /* duplicate or schema mismatch — skip */ }
            }
            report.inserted_to_db = inserted;
        }

        res.json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

module.exports = router;
