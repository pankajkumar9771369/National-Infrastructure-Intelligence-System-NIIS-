const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/budgets
router.get('/', async (req, res) => {
    const { priority, maintenance_type } = req.query;
    let where = [];
    let params = [];
    let idx = 1;
    if (priority) { where.push(`bp.priority = $${idx++}`); params.push(priority); }
    if (maintenance_type) { where.push(`bp.maintenance_type = $${idx++}`); params.push(maintenance_type); }
    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
    try {
        const result = await pool.query(
            `SELECT bp.*, i.name, i.type, i.area, rs.risk_score, rs.risk_level
       FROM budget_plans bp
       JOIN infrastructures i ON i.id = bp.infrastructure_id
       LEFT JOIN risk_scores rs ON rs.infrastructure_id = bp.infrastructure_id
       ${whereSQL}
       ORDER BY bp.planned_year ASC, rs.risk_score DESC`, params
        );
        const totalBudget = result.rows.reduce((sum, r) => sum + parseFloat(r.estimated_cost_usd || 0), 0);
        res.json({ success: true, total_budget_usd: Math.round(totalBudget), data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgets/summary — budget by year and tier
router.get('/summary', async (req, res) => {
    try {
        const byYear = await pool.query(
            `SELECT planned_year, SUM(estimated_cost_usd) as total_cost, COUNT(*) as structure_count
       FROM budget_plans GROUP BY planned_year ORDER BY planned_year`
        );
        const byTier = await pool.query(
            `SELECT maintenance_type, priority, SUM(estimated_cost_usd) as total_cost, COUNT(*) as count
       FROM budget_plans GROUP BY maintenance_type, priority ORDER BY total_cost DESC`
        );
        res.json({ success: true, by_year: byYear.rows, by_tier: byTier.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
