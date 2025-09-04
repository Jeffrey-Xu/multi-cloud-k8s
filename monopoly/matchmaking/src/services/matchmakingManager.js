const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class MatchmakingManager {
  constructor(redisClient, io) {
    this.redis = redisClient;
    this.io = io;
    this.gameEngineUrl = process.env.GAME_ENGINE_URL || 'http://game-engine-service:3001';
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
    
    // Start matchmaking loop
    this.startMatchmaking();
  }

  async addPlayerToQueue(socketId, playerData) {
    const { userId, gameMode = 'classic', skillLevel = 'beginner' } = playerData;
    
    // Validate user exists
    try {
      await axios.get(`${this.userServiceUrl}/api/users/profile`, {
        headers: { Authorization: `Bearer ${playerData.token}` }
      });
    } catch (error) {
      throw new Error('Invalid user token');
    }

    const player = {
      socketId,
      userId,
      gameMode,
      skillLevel,
      joinedAt: Date.now()
    };

    // Add to queue
    const queueKey = `queue:${gameMode}:${skillLevel}`;
    await this.redis.lPush(queueKey, JSON.stringify(player));
    
    // Store player mapping
    await this.redis.set(`player:${socketId}`, JSON.stringify(player));

    console.log(`Player ${userId} joined queue: ${queueKey}`);
    
    // Notify player
    this.io.to(socketId).emit('queue-joined', {
      message: 'Successfully joined matchmaking queue',
      position: await this.redis.lLen(queueKey)
    });
  }

  async removePlayerFromQueue(socketId) {
    const playerData = await this.redis.get(`player:${socketId}`);
    if (!playerData) return;

    const player = JSON.parse(playerData);
    const queueKey = `queue:${player.gameMode}:${player.skillLevel}`;
    
    // Remove from queue
    await this.redis.lRem(queueKey, 1, JSON.stringify(player));
    await this.redis.del(`player:${socketId}`);

    console.log(`Player ${player.userId} left queue: ${queueKey}`);
  }

  async startMatchmaking() {
    setInterval(async () => {
      try {
        await this.processQueues();
      } catch (error) {
        console.error('Matchmaking error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  async processQueues() {
    const gameModes = ['classic', 'speed', 'tournament'];
    const skillLevels = ['beginner', 'intermediate', 'advanced'];

    for (const gameMode of gameModes) {
      for (const skillLevel of skillLevels) {
        await this.processQueue(gameMode, skillLevel);
      }
    }
  }

  async processQueue(gameMode, skillLevel) {
    const queueKey = `queue:${gameMode}:${skillLevel}`;
    const queueLength = await this.redis.lLen(queueKey);

    // Need at least 2 players for a game
    if (queueLength < 2) return;

    const playersNeeded = this.getPlayersNeeded(gameMode);
    const playersToMatch = Math.min(queueLength, playersNeeded);

    if (playersToMatch >= 2) {
      const players = [];
      
      // Get players from queue
      for (let i = 0; i < playersToMatch; i++) {
        const playerData = await this.redis.rPop(queueKey);
        if (playerData) {
          players.push(JSON.parse(playerData));
        }
      }

      if (players.length >= 2) {
        await this.createGame(players, gameMode);
      }
    }
  }

  getPlayersNeeded(gameMode) {
    switch (gameMode) {
      case 'speed': return 2;
      case 'tournament': return 4;
      default: return 4; // classic
    }
  }

  async createGame(players, gameMode) {
    try {
      const gameId = uuidv4();
      
      // Create game in game engine
      const gameResponse = await axios.post(`${this.gameEngineUrl}/api/games`, {
        gameId,
        gameMode,
        players: players.map(p => ({
          userId: p.userId,
          socketId: p.socketId
        }))
      });

      if (gameResponse.status === 201) {
        // Notify all players
        players.forEach(player => {
          this.io.to(player.socketId).emit('game-found', {
            gameId,
            gameMode,
            players: players.length,
            message: 'Game found! Connecting to game...'
          });

          // Clean up player data
          this.redis.del(`player:${player.socketId}`);
        });

        console.log(`Game created: ${gameId} with ${players.length} players`);
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      
      // Return players to queue on failure
      const queueKey = `queue:${gameMode}:${players[0].skillLevel}`;
      players.forEach(async (player) => {
        await this.redis.lPush(queueKey, JSON.stringify(player));
        this.io.to(player.socketId).emit('matchmaking-error', {
          message: 'Failed to create game. You have been returned to the queue.'
        });
      });
    }
  }

  async getQueueStatus() {
    const gameModes = ['classic', 'speed', 'tournament'];
    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const status = {};

    for (const gameMode of gameModes) {
      status[gameMode] = {};
      for (const skillLevel of skillLevels) {
        const queueKey = `queue:${gameMode}:${skillLevel}`;
        const count = await this.redis.lLen(queueKey);
        status[gameMode][skillLevel] = count;
      }
    }

    return status;
  }
}

module.exports = MatchmakingManager;
