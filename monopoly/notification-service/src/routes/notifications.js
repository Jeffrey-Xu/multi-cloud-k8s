const express = require('express');
const Joi = require('joi');

const router = express.Router();

// Send notification schema
const sendNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  actionUrl: Joi.string().uri(),
  actionText: Joi.string(),
  data: Joi.object()
});

// Send notification to user
router.post('/send', async (req, res) => {
  try {
    const { error, value } = sendNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    await req.notificationManager.sendToUser(value.userId, value);
    
    res.json({
      message: 'Notification sent successfully',
      notification: value
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Broadcast notification schema
const broadcastSchema = Joi.object({
  type: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  data: Joi.object()
});

// Broadcast to all users
router.post('/broadcast', async (req, res) => {
  try {
    const { error, value } = broadcastSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    await req.notificationManager.broadcastToAll(value);
    
    res.json({
      message: 'Broadcast sent successfully',
      notification: value
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Get user notifications
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const notifications = await req.notificationManager.getUserNotifications(userId, limit);
    
    res.json({
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/read/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    await req.notificationManager.markAsRead(userId, notificationId);
    
    res.json({
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Game-specific notification endpoints
router.post('/game/:gameId/start', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { players } = req.body;
    
    await req.notificationManager.sendGameStart(gameId, players);
    
    res.json({
      message: 'Game start notification sent',
      gameId
    });

  } catch (error) {
    console.error('Game start notification error:', error);
    res.status(500).json({ error: 'Failed to send game start notification' });
  }
});

router.post('/game/:gameId/turn/:userId', async (req, res) => {
  try {
    const { gameId, userId } = req.params;
    
    await req.notificationManager.sendTurnNotification(userId, gameId);
    
    res.json({
      message: 'Turn notification sent',
      gameId,
      userId
    });

  } catch (error) {
    console.error('Turn notification error:', error);
    res.status(500).json({ error: 'Failed to send turn notification' });
  }
});

router.post('/game/:gameId/end', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { winner, players } = req.body;
    
    await req.notificationManager.sendGameEnd(gameId, winner, players);
    
    res.json({
      message: 'Game end notification sent',
      gameId
    });

  } catch (error) {
    console.error('Game end notification error:', error);
    res.status(500).json({ error: 'Failed to send game end notification' });
  }
});

module.exports = router;
