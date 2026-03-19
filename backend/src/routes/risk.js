const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/risk-scores — all risk scores with infra details
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT rs.*, i.name, i.type, i.area, i.latitude, i.longitude, i.age_years, i.material, i.traffic_load, i.env_exposure
       FROM risk_scores rs
       JOIN infrastructures i ON i.id = rs.infrastructure_id
       ORDER BY rs.risk_score DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/risk-scores/heatmap — lat/lng with risk for Leaflet heatmap
router.get('/heatmap', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT i.latitude, i.longitude, rs.risk_score, rs.risk_level, i.name, i.type
       FROM risk_scores rs
       JOIN infrastructures i ON i.id = rs.infrastructure_id`
        );
        // Leaflet heat format: [lat, lng, intensity]
        const heatData = result.rows.map(r => ({
            lat: parseFloat(r.latitude),
            lng: parseFloat(r.longitude),
            intensity: parseFloat(r.risk_score) / 100,
            risk_score: parseFloat(r.risk_score),
            risk_level: r.risk_level,
            name: r.name,
            type: r.type
        }));
        res.json({ success: true, data: heatData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
