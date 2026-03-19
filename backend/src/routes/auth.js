const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'smart_city_jwt_secret_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register — public signup, ALWAYS creates a viewer (admin role is restricted)
router.post('/register', async (req, res) => {
    const { username, password, full_name } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES ($1,$2,$3,$4) RETURNING id, username, role, full_name',
            [username, hash, 'viewer', full_name || username]  // role is ALWAYS viewer
        );
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
