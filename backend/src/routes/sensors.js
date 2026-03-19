const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/sensors/:infra_id — latest sensor readings
router.get('/:infra_id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM sensor_readings WHERE infrastructure_id = $1 ORDER BY timestamp DESC LIMIT 50',
            [req.params.infra_id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sensors/simulate — insert simulated sensor reading
router.post('/simulate', async (req, res) => {
    const { infrastructure_id, sensor_type, value, unit } = req.body;
    const is_anomaly = Math.random() < 0.05;
    try {
        const result = await pool.query(
            'INSERT INTO sensor_readings (infrastructure_id, sensor_type, value, unit, is_anomaly) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [infrastructure_id, sensor_type, value, unit, is_anomaly]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
