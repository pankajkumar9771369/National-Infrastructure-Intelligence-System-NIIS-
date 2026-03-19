const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/optimize/budget
 * NIIS Policy-Grade Budget Optimizer
 * Sends structures + budget constraints to ML service LP optimizer
 */
router.post('/budget', authenticate, async (req, res) => {
    const {
        budget_inr_crore,
        min_critical_structures = 0,
        prioritize_national_highways = true,
        prioritize_high_economic_importance = true,
        max_single_city_allocation_pct = null,
        year_filter = null
    } = req.body;

    if (!budget_inr_crore || budget_inr_crore <= 0) {
        return res.status(400).json({ error: 'budget_inr_crore must be a positive number' });
    }

    try {
        // Fetch all structures with their risk scores and budget plans from DB
        const result = await pool.query(`
            SELECT
                i.id, i.name, i.city, i.state, i.route_type, i.economic_importance,
                rs.risk_score, rs.risk_level,
                COALESCE(bp.estimated_cost_inr_crore, 10.0) AS estimated_cost_inr_crore,
                COALESCE(bp.risk_reduction_points, rs.risk_score * 0.3) AS risk_reduction_points,
                COALESCE(bp.maintenance_type, 'preventive') AS maintenance_type,
                bp.planned_year
            FROM infrastructures i
            JOIN risk_scores rs ON rs.infrastructure_id = i.id
            LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
            WHERE bp.estimated_cost_inr_crore > 0 OR bp.estimated_cost_inr_crore IS NULL
            ORDER BY rs.risk_score DESC
        `);

        const structures = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            city: row.city,
            state: row.state,
            route_type: row.route_type || 'city',
            economic_importance: row.economic_importance || 'medium',
            risk_score: parseFloat(row.risk_score),
            risk_level: row.risk_level,
            estimated_cost_inr_crore: parseFloat(row.estimated_cost_inr_crore) || 10.0,
            risk_reduction_points: parseFloat(row.risk_reduction_points),
            maintenance_type: row.maintenance_type,
            planned_year: row.planned_year || 2025
        }));

        // Call ML optimizer
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/optimize/budget`, {
            structures,
            constraints: {
                total_budget_inr_crore: parseFloat(budget_inr_crore),
                min_critical_structures,
                prioritize_national_highways,
                prioritize_high_economic_importance,
                max_single_city_allocation_pct,
                year_filter
            }
        });

        const optimizationResult = mlResponse.data.data;

        // Store the run in DB for traceability
        await pool.query(`
            INSERT INTO optimization_runs
                (run_id, budget_inr_crore, total_structures_considered, structures_selected,
                 total_risk_before, total_risk_after, risk_reduction_percent,
                 total_cost_inr_crore, constraints, selected_structure_ids, run_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
            optimizationResult.run_id,
            budget_inr_crore,
            structures.length,
            optimizationResult.structures_selected,
            optimizationResult.total_risk_before,
            optimizationResult.total_risk_after,
            optimizationResult.risk_reduction_pct,
            optimizationResult.total_cost_inr_crore,
            JSON.stringify(optimizationResult.constraints_applied),
            JSON.stringify(optimizationResult.selected_structures.map(s => s.id)),
            req.user.id
        ]);

        res.json({ success: true, data: optimizationResult });
    } catch (err) {
        console.error('Optimizer error:', err.message);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

/**
 * GET /api/optimize/history
 * Returns past optimization runs (for accountability)
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, u.full_name as run_by_name
            FROM optimization_runs o
            LEFT JOIN users u ON u.id = o.run_by
            ORDER BY o.run_at DESC
            LIMIT 20
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
