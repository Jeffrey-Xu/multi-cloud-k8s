const express = require('express');
const Joi = require('joi');

const router = express.Router();

// Get queue status
router.get('/status', async (req, res) => {
  try {
    const status = await req.matchmakingManager.getQueueStatus();
    res.json({
      queues: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Get active games count
router.get('/games/active', async (req, res) => {
  try {
    const activeGames = await req.redisClient.keys('game:*');
    res.json({
      activeGames: activeGames.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Active games error:', error);
    res.status(500).json({ error: 'Failed to get active games count' });
  }
});

// Manual matchmaking (for testing)
const manualMatchSchema = Joi.object({
  gameMode: Joi.string().valid('classic', 'speed', 'tournament').default('classic'),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
  playerCount: Joi.number().integer().min(2).max(4).default(2)
});

router.post('/manual-match', async (req, res) => {
  try {
    const { error, value } = manualMatchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { gameMode, skillLevel, playerCount } = value;
    const queueKey = `queue:${gameMode}:${skillLevel}`;
    const queueLength = await req.redisClient.lLen(queueKey);

    if (queueLength < playerCount) {
      return res.status(400).json({ 
        error: `Not enough players in queue. Need ${playerCount}, have ${queueLength}` 
      });
    }

    // Force process this specific queue
    await req.matchmakingManager.processQueue(gameMode, skillLevel);

    res.json({
      message: 'Manual matchmaking triggered',
      gameMode,
      skillLevel,
      playersMatched: playerCount
    });

  } catch (error) {
    console.error('Manual match error:', error);
    res.status(500).json({ error: 'Failed to trigger manual match' });
  }
});

module.exports = router;
