const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const redis = require('redis');
const matchmakingRoutes = require('./routes/matchmaking');
const healthRoutes = require('./routes/health');
const MatchmakingManager = require('./services/matchmakingManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3003;

// Redis client
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

// Initialize matchmaking manager
const matchmakingManager = new MatchmakingManager(redisClient, io);

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make services available to routes
app.use((req, res, next) => {
  req.redisClient = redisClient;
  req.matchmakingManager = matchmakingManager;
  req.io = io;
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/matchmaking', matchmakingRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join-queue', async (data) => {
    try {
      await matchmakingManager.addPlayerToQueue(socket.id, data);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

  socket.on('leave-queue', async () => {
    try {
      await matchmakingManager.removePlayerFromQueue(socket.id);
    } catch (error) {
      socket.emit('error', { message: 'Failed to leave queue' });
    }
  });

  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id);
    await matchmakingManager.removePlayerFromQueue(socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Matchmaking Service running on port ${PORT}`);
});

module.exports = { app, server };
// Updated Thu  4 Sep 2025 20:26:52 CST
