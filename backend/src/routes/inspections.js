const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// POST /api/inspections — log a new inspection (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    const {
        infrastructure_id, inspection_date, observed_condition,
        observed_risk_level, inspection_type = 'routine',
        findings, recommendations
    } = req.body;

    if (!infrastructure_id || !inspection_date || !observed_condition) {
        return res.status(400).json({ error: 'infrastructure_id, inspection_date, and observed_condition are required' });
    }
    try {
        const result = await pool.query(`
            INSERT INTO inspection_records
                (infrastructure_id, inspector_id, inspection_date, observed_condition,
                 observed_risk_level, inspection_type, findings, recommendations)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [infrastructure_id, req.user.id, inspection_date, observed_condition,
                observed_risk_level, inspection_type, findings, recommendations]
        );

        // Update the structure's last_inspection_date
        await pool.query(
            `UPDATE infrastructures SET last_inspection_date=$1, updated_at=NOW() WHERE id=$2`,
            [inspection_date, infrastructure_id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/inspections/:infra_id — get inspection history for a structure
router.get('/:infra_id', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ir.*, u.full_name AS inspector_name, u.department AS inspector_dept
            FROM inspection_records ir
            LEFT JOIN users u ON u.id = ir.inspector_id
            WHERE ir.infrastructure_id = $1
            ORDER BY ir.inspection_date DESC`,
            [req.params.infra_id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/inspections — all recent inspections (admin dashboard)
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ir.*, i.name AS structure_name, i.city, i.type,
                   u.full_name AS inspector_name
            FROM inspection_records ir
            JOIN infrastructures i ON i.id = ir.infrastructure_id
            LEFT JOIN users u ON u.id = ir.inspector_id
            ORDER BY ir.inspection_date DESC
            LIMIT 50`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
