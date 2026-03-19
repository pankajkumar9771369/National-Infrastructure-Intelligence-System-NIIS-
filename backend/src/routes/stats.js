const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/stats/summary — National dashboard KPIs
router.get('/summary', async (req, res) => {
  try {
    const stats = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM infrastructures) AS total_structures,
                (SELECT COUNT(DISTINCT city) FROM infrastructures) AS total_cities,
                (SELECT COUNT(DISTINCT state) FROM infrastructures) AS total_states,
                (SELECT COUNT(*) FROM infrastructures WHERE type='bridge') AS total_bridges,
                (SELECT COUNT(*) FROM infrastructures WHERE type='road') AS total_roads,
                (SELECT COUNT(*) FROM infrastructures WHERE route_type='national_highway') AS total_national_highways,
                (SELECT ROUND(AVG(risk_score)::numeric, 2) FROM risk_scores) AS avg_risk_score,
                (SELECT ROUND(AVG(health_score)::numeric, 2) FROM risk_scores) AS avg_health_score,
                (SELECT COUNT(*) FROM risk_scores WHERE risk_level='critical') AS critical_count,
                (SELECT COUNT(*) FROM risk_scores WHERE risk_level='high') AS high_count,
                (SELECT COUNT(*) FROM risk_scores WHERE risk_level='moderate') AS moderate_count,
                (SELECT COUNT(*) FROM risk_scores WHERE risk_level='low') AS low_count,
                (SELECT COUNT(*) FROM infrastructures WHERE economic_importance='critical') AS critical_economic,
                (SELECT ROUND(SUM(estimated_cost_usd)::numeric, 0) FROM budget_plans) AS total_budget_usd,
                (SELECT ROUND(SUM(estimated_cost_inr_crore)::numeric, 2) FROM budget_plans) AS total_budget_inr_crore,
                (SELECT COUNT(*) FROM budget_plans WHERE planned_year = 2025) AS urgent_2025,
                (SELECT MIN(predicted_maintenance_year) FROM ml_predictions) AS earliest_maintenance,
                (SELECT COUNT(*) FROM inspection_records) AS total_inspections,
                (SELECT COUNT(*) FROM inspection_records WHERE inspection_date >= NOW() - INTERVAL '30 days') AS recent_inspections
        `);

    const riskByType = await pool.query(`
            SELECT i.type, ROUND(AVG(rs.risk_score)::numeric, 2) AS avg_risk,
                   COUNT(*) AS count, ROUND(AVG(rs.composite_priority_score)::numeric, 2) AS avg_priority
            FROM infrastructures i JOIN risk_scores rs ON rs.infrastructure_id = i.id
            GROUP BY i.type ORDER BY avg_risk DESC
        `);

    const riskByCity = await pool.query(`
            SELECT i.city, i.state,
                   ROUND(AVG(rs.risk_score)::numeric, 2) AS avg_risk,
                   COUNT(*) AS count,
                   COUNT(*) FILTER (WHERE rs.risk_level = 'critical') AS critical_count,
                   ROUND(SUM(bp.estimated_cost_inr_crore)::numeric, 2) AS total_budget_crore
            FROM infrastructures i
            JOIN risk_scores rs ON rs.infrastructure_id = i.id
            LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
            GROUP BY i.city, i.state ORDER BY avg_risk DESC LIMIT 10
        `);

    const riskByRouteType = await pool.query(`
            SELECT i.route_type, ROUND(AVG(rs.risk_score)::numeric, 2) AS avg_risk,
                   COUNT(*) AS count, COUNT(*) FILTER (WHERE rs.risk_level = 'critical') AS critical_count
            FROM infrastructures i JOIN risk_scores rs ON rs.infrastructure_id = i.id
            GROUP BY i.route_type ORDER BY avg_risk DESC
        `);

    const criticalStructures = await pool.query(`
            SELECT i.id, i.name, i.city, i.state, i.type, i.route_type, i.economic_importance,
                   rs.risk_score, rs.composite_priority_score, bp.estimated_cost_inr_crore
            FROM infrastructures i
            JOIN risk_scores rs ON rs.infrastructure_id = i.id
            LEFT JOIN budget_plans bp ON bp.infrastructure_id = i.id
            WHERE rs.risk_level = 'critical'
            ORDER BY rs.composite_priority_score DESC NULLS LAST LIMIT 10
        `);

    res.json({
      success: true,
      summary: stats.rows[0],
      by_type: riskByType.rows,
      by_area: riskByCity.rows,     // kept for backward compat
      by_city: riskByCity.rows,
      by_route_type: riskByRouteType.rows,
      critical_structures: criticalStructures.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
