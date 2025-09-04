const nodemailer = require('nodemailer');

class NotificationManager {
  constructor(redisClient, io) {
    this.redis = redisClient;
    this.io = io;
    this.setupEmailTransporter();
  }

  setupEmailTransporter() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async registerUserSocket(userId, socketId) {
    await this.redis.set(`socket:${socketId}`, userId);
    await this.redis.sAdd(`user_sockets:${userId}`, socketId);
  }

  async unregisterSocket(socketId) {
    const userId = await this.redis.get(`socket:${socketId}`);
    if (userId) {
      await this.redis.sRem(`user_sockets:${userId}`, socketId);
      await this.redis.del(`socket:${socketId}`);
    }
  }

  async sendToUser(userId, notification) {
    // Send real-time notification
    this.io.to(`user:${userId}`).emit('notification', notification);
    
    // Store notification for offline users
    await this.storeNotification(userId, notification);
    
    // Send email if critical
    if (notification.priority === 'high') {
      await this.sendEmail(userId, notification);
    }
  }

  async sendToGame(gameId, notification) {
    this.io.to(`game:${gameId}`).emit('game-notification', notification);
  }

  async broadcastToAll(notification) {
    this.io.emit('broadcast', notification);
  }

  async storeNotification(userId, notification) {
    const notificationData = {
      ...notification,
      id: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      read: false
    };

    await this.redis.lPush(
      `notifications:${userId}`, 
      JSON.stringify(notificationData)
    );

    // Keep only last 100 notifications
    await this.redis.lTrim(`notifications:${userId}`, 0, 99);
  }

  async getUserNotifications(userId, limit = 20) {
    const notifications = await this.redis.lRange(
      `notifications:${userId}`, 
      0, 
      limit - 1
    );
    
    return notifications.map(n => JSON.parse(n));
  }

  async markAsRead(userId, notificationId) {
    const notifications = await this.redis.lRange(`notifications:${userId}`, 0, -1);
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = JSON.parse(notifications[i]);
      if (notification.id === notificationId) {
        notification.read = true;
        await this.redis.lSet(`notifications:${userId}`, i, JSON.stringify(notification));
        break;
      }
    }
  }

  async sendEmail(userId, notification) {
    try {
      // Get user email from user service (simplified for now)
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) return;

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@monopolygame.com',
        to: userEmail,
        subject: notification.title,
        html: this.generateEmailTemplate(notification)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${userEmail} for notification: ${notification.title}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  async getUserEmail(userId) {
    // In a real implementation, this would call the user service
    // For now, return a placeholder
    return `user${userId}@example.com`;
  }

  generateEmailTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${notification.title}</h2>
        <p style="color: #34495e; line-height: 1.6;">${notification.message}</p>
        ${notification.actionUrl ? `
          <a href="${notification.actionUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #3498db; 
                    color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            ${notification.actionText || 'View Details'}
          </a>
        ` : ''}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated message from Monopoly Game Platform.
        </p>
      </div>
    `;
  }

  // Predefined notification types
  async sendGameInvite(userId, gameData) {
    const notification = {
      type: 'game_invite',
      title: 'Game Invitation',
      message: `You've been invited to join a ${gameData.gameMode} game!`,
      priority: 'medium',
      actionUrl: `/game/${gameData.gameId}`,
      actionText: 'Join Game',
      data: gameData
    };

    await this.sendToUser(userId, notification);
  }

  async sendGameStart(gameId, players) {
    const notification = {
      type: 'game_start',
      title: 'Game Started',
      message: 'Your game has started! It\'s time to play.',
      priority: 'high'
    };

    await this.sendToGame(gameId, notification);
  }

  async sendTurnNotification(userId, gameId) {
    const notification = {
      type: 'turn_notification',
      title: 'Your Turn',
      message: 'It\'s your turn to play!',
      priority: 'high',
      actionUrl: `/game/${gameId}`,
      actionText: 'Play Now'
    };

    await this.sendToUser(userId, notification);
  }

  async sendGameEnd(gameId, winner, players) {
    const notification = {
      type: 'game_end',
      title: 'Game Finished',
      message: `Game completed! Winner: ${winner.username}`,
      priority: 'medium',
      data: { winner, finalScores: players }
    };

    await this.sendToGame(gameId, notification);
  }
}

module.exports = NotificationManager;
