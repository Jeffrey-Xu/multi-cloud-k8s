const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const Joi = require('joi');

const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'monopoly_game',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, created_at, last_login, 
              games_played, games_won, total_score, level, avatar_url
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  avatar_url: Joi.string().uri()
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      updates.push(`${key} = $${paramCount}`);
      values.push(val);
      paramCount++;
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.user.userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramCount}
      RETURNING id, username, email, avatar_url, updated_at
    `;

    const result = await pool.query(query, values);
    res.json({ 
      message: 'Profile updated successfully',
      user: result.rows[0] 
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT games_played, games_won, total_score, level,
              CASE WHEN games_played > 0 THEN ROUND((games_won::float / games_played) * 100, 2) ELSE 0 END as win_rate
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Update user stats (called by game engine)
const updateStatsSchema = Joi.object({
  games_played: Joi.number().integer().min(0),
  games_won: Joi.number().integer().min(0),
  total_score: Joi.number().integer().min(0),
  level: Joi.number().integer().min(1).max(100)
});

router.put('/stats', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateStatsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      updates.push(`${key} = $${paramCount}`);
      values.push(val);
      paramCount++;
    });

    values.push(req.user.userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramCount}
      RETURNING games_played, games_won, total_score, level
    `;

    const result = await pool.query(query, values);
    res.json({ 
      message: 'Stats updated successfully',
      stats: result.rows[0] 
    });

  } catch (error) {
    console.error('Stats update error:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

module.exports = router;
