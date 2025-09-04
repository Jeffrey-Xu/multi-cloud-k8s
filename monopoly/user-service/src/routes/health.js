const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Database connection for health checks
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'monopoly_game',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false
});

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = dbResult.rows.length > 0;

    const health = {
      status: 'healthy',
      service: 'monopoly-user-service',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    res.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'monopoly-user-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

module.exports = router;
