const express = require('express');

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Check Redis connection
    const redisHealthy = await req.redisClient.ping() === 'PONG';
    
    // Check email service (if configured)
    let emailHealthy = true;
    if (process.env.SMTP_HOST) {
      try {
        await req.notificationManager.emailTransporter.verify();
      } catch (error) {
        emailHealthy = false;
        console.warn('Email service health check failed:', error.message);
      }
    }

    const health = {
      status: 'healthy',
      service: 'monopoly-notification-service',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        email: emailHealthy ? 'healthy' : 'unhealthy',
        websocket: 'healthy', // Socket.IO is always available if service is running
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    const overallHealthy = redisHealthy;
    res.status(overallHealthy ? 200 : 503).json(health);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'monopoly-notification-service',
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
