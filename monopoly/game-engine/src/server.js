const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const redis = require('redis');
const axios = require('axios');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'monopoly_game',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.connect();

// Service URLs
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004';

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Database helper functions
async function createGame(gameId, gameMode = 'classic', maxPlayers = 4) {
  const result = await pool.query(
    'INSERT INTO game_sessions (id, status, max_players, game_mode) VALUES ($1, $2, $3, $4) RETURNING *',
    [gameId, 'waiting', maxPlayers, gameMode]
  );
  return result.rows[0];
}

async function getGame(gameId) {
  const result = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [gameId]);
  return result.rows[0];
}

async function addPlayerToGame(gameId, playerId, playerName, userId) {
  const result = await pool.query(
    'INSERT INTO game_players (id, game_id, user_id, player_name) VALUES ($1, $2, $3, $4) RETURNING *',
    [playerId, gameId, userId, playerName]
  );
  return result.rows[0];
}

async function getGamePlayers(gameId) {
  const result = await pool.query('SELECT * FROM game_players WHERE game_id = $1', [gameId]);
  return result.rows;
}

async function validateUser(userId, token) {
  try {
    const response = await axios.get(`${userServiceUrl}/api/users/${userId}/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw new Error('Invalid user token');
  }
}

async function notifyGameEvent(gameId, event) {
  try {
    await axios.post(`${notificationServiceUrl}/api/notify/game-event`, {
      gameId,
      event
    });
  } catch (error) {
    console.warn('Failed to send notification:', error.message);
  }
}

// Monopoly board configuration
const BOARD_SPACES = [
  { id: 0, name: 'GO', type: 'special', price: 0 },
  { id: 1, name: 'Mediterranean Avenue', type: 'property', price: 60, rent: 2 },
  { id: 2, name: 'Community Chest', type: 'card', price: 0 },
  { id: 3, name: 'Baltic Avenue', type: 'property', price: 60, rent: 4 },
  { id: 4, name: 'Income Tax', type: 'tax', price: 200 },
  { id: 5, name: 'Reading Railroad', type: 'railroad', price: 200, rent: 25 },
  // ... (simplified board for MVP)
];

// Game Engine Class
class MonopolyGame {
  constructor(gameId) {
    this.id = gameId;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.board = BOARD_SPACES;
    this.status = 'waiting'; // waiting, active, finished
    this.createdAt = new Date();
  }

  addPlayer(playerId, playerName) {
    if (this.players.length >= 4) {
      throw new Error('Game is full');
    }

    const player = {
      id: playerId,
      name: playerName,
      position: 0,
      money: 1500,
      properties: [],
      inJail: false,
      connected: true
    };

    this.players.push(player);
    
    if (this.players.length >= 2) {
      this.status = 'active';
    }

    return player;
  }

  rollDice() {
    return {
      dice1: Math.floor(Math.random() * 6) + 1,
      dice2: Math.floor(Math.random() * 6) + 1
    };
  }

  movePlayer(playerId, steps) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const oldPosition = player.position;
    player.position = (player.position + steps) % this.board.length;

    // Collect $200 for passing GO
    if (player.position < oldPosition) {
      player.money += 200;
    }

    return {
      playerId,
      oldPosition,
      newPosition: player.position,
      passedGo: player.position < oldPosition,
      currentSpace: this.board[player.position]
    };
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    return this.getCurrentPlayer();
  }

  getGameState() {
    return {
      id: this.id,
      players: this.players,
      currentPlayer: this.getCurrentPlayer(),
      status: this.status,
      board: this.board
    };
  }
}

// REST API Routes
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = !!dbResult.rows[0];

    // Check Redis connection
    const redisHealthy = redisClient.isReady;

    // Get active games count
    const gamesResult = await pool.query('SELECT COUNT(*) FROM game_sessions WHERE status IN ($1, $2)', ['waiting', 'active']);
    const activeGames = parseInt(gamesResult.rows[0].count);

    res.json({ 
      status: 'healthy', 
      service: 'monopoly-game-engine',
      timestamp: new Date().toISOString(),
      activeGames,
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'monopoly-game-engine',
      error: error.message
    });
  }
});

app.post('/games', async (req, res) => {
  try {
    const { gameMode = 'classic', maxPlayers = 4 } = req.body;
    const gameId = uuidv4();
    
    const game = await createGame(gameId, gameMode, maxPlayers);
    
    // Cache game state in Redis
    await redisClient.hSet(`game:${gameId}`, {
      status: game.status,
      gameMode: game.game_mode,
      maxPlayers: game.max_players,
      createdAt: game.created_at
    });

    res.status(201).json({
      gameId: game.id,
      status: game.status,
      gameMode: game.game_mode,
      maxPlayers: game.max_players,
      message: 'Game created successfully'
    });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/games/:gameId', (req, res) => {
  try {
    const game = games.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game.getGameState());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/games/:gameId/join', async (req, res) => {
  try {
    const { playerName, userId, token } = req.body;
    const { gameId } = req.params;
    
    // Validate user token
    await validateUser(userId, token);
    
    // Check if game exists
    const game = await getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game is not accepting new players' });
    }

    // Check if game is full
    const currentPlayers = await getGamePlayers(gameId);
    if (currentPlayers.length >= game.max_players) {
      return res.status(400).json({ error: 'Game is full' });
    }

    // Add player to game
    const playerId = uuidv4();
    const player = await addPlayerToGame(gameId, playerId, playerName, userId);

    // Update Redis cache
    await redisClient.sAdd(`game:${gameId}:players`, playerId);
    await redisClient.hSet(`player:${playerId}`, {
      gameId,
      userId,
      playerName,
      joinedAt: Date.now()
    });

    // Notify other players via WebSocket
    io.to(gameId).emit('playerJoined', {
      player: {
        id: player.id,
        name: player.player_name,
        userId: player.user_id
      },
      gameId
    });

    // Send notification
    await notifyGameEvent(gameId, {
      type: 'player_joined',
      playerId,
      playerName
    });

    res.status(201).json({
      playerId: player.id,
      player: {
        id: player.id,
        name: player.player_name,
        userId: player.user_id,
        position: player.position,
        money: player.money
      }
    });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/games/:gameId/roll', (req, res) => {
  try {
    const { playerId } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    const diceRoll = game.rollDice();
    const totalSteps = diceRoll.dice1 + diceRoll.dice2;
    const moveResult = game.movePlayer(playerId, totalSteps);
    
    // Next player's turn
    const nextPlayer = game.nextTurn();

    const gameEvent = {
      type: 'diceRoll',
      playerId,
      diceRoll,
      moveResult,
      nextPlayer,
      gameState: game.getGameState()
    };

    // Broadcast to all players in the game
    io.to(req.params.gameId).emit('gameUpdate', gameEvent);

    res.json(gameEvent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinGame', ({ gameId, playerId }) => {
    socket.join(gameId);
    socket.gameId = gameId;
    socket.playerId = playerId;
    
    console.log(`Player ${playerId} joined game ${gameId}`);
    
    // Send current game state to the joining player
    const game = games.get(gameId);
    if (game) {
      socket.emit('gameState', game.getGameState());
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    if (socket.gameId && socket.playerId) {
      // Mark player as disconnected
      const playerData = players.get(socket.playerId);
      if (playerData) {
        playerData.connected = false;
        
        // Notify other players
        socket.to(socket.gameId).emit('playerDisconnected', {
          playerId: socket.playerId
        });
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Monopoly Game Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
