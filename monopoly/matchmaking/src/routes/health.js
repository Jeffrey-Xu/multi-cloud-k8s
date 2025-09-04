const express = require('express');
const axios = require('axios');

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Check Redis connection
    const redisHealthy = await req.redisClient.ping() === 'PONG';
    
    // Check game engine connectivity
    let gameEngineHealthy = false;
    try {
      const gameEngineUrl = process.env.GAME_ENGINE_URL || 'http://game-engine-service:3001';
      const response = await axios.get(`${gameEngineUrl}/health`, { timeout: 5000 });
      gameEngineHealthy = response.status === 200;
    } catch (error) {
      console.warn('Game engine health check failed:', error.message);
    }

    const health = {
      status: 'healthy',
      service: 'monopoly-matchmaking-service',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        gameEngine: gameEngineHealthy ? 'healthy' : 'unhealthy',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    const overallHealthy = redisHealthy && gameEngineHealthy;
    res.status(overallHealthy ? 200 : 503).json(health);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'monopoly-matchmaking-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    const redisReady = await req.redisClient.ping() === 'PONG';
    if (redisReady) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'Redis not available' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

module.exports = router;
