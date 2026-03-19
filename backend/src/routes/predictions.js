const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/predictions/:infra_id
router.get('/:infra_id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ml_predictions WHERE infrastructure_id = $1', [req.params.infra_id]);
        res.json({ success: true, data: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/predictions — all
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, i.name, i.type, i.area FROM ml_predictions p JOIN infrastructures i ON i.id = p.infrastructure_id ORDER BY p.predicted_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
