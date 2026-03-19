const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ── Ensure notifications table exists ──────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    message      TEXT NOT NULL,
    infra_name   VARCHAR(150),
    infra_id     INTEGER REFERENCES infrastructures(id) ON DELETE SET NULL,
    notify_year  INTEGER,
    type         VARCHAR(30) DEFAULT 'maintenance' CHECK (type IN ('maintenance','closure','inspection','alert')),
    severity     VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    is_active    BOOLEAN DEFAULT TRUE,
    created_by   INTEGER REFERENCES users(id),
    created_at   TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('[notifications] table init error:', err.message));

// GET /api/notifications — all active notifications (public — users can see)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT n.*, i.type as infra_type, i.area, i.city, i.state,
                   u.full_name as created_by_name
            FROM notifications n
            LEFT JOIN infrastructures i ON i.id  = n.infra_id
            LEFT JOIN users u           ON u.id  = n.created_by
            WHERE n.is_active = TRUE
            ORDER BY n.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/notifications/all — all (including dismissed) for admin
router.get('/all', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT n.*, i.type as infra_type,
                   u.full_name as created_by_name
            FROM notifications n
            LEFT JOIN infrastructures i ON i.id = n.infra_id
            LEFT JOIN users u ON u.id = n.created_by
            ORDER BY n.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications — create (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    const { title, message, infra_id, infra_name, notify_year, type, severity } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message are required' });
    try {
        const result = await pool.query(
            `INSERT INTO notifications (title, message, infra_id, infra_name, notify_year, type, severity, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [title, message, infra_id || null, infra_name || null,
                notify_year || null, type || 'maintenance', severity || 'info', req.user?.id || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/notifications/:id/dismiss — admin dismisses/restores
router.patch('/:id/dismiss', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE notifications SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/notifications/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
