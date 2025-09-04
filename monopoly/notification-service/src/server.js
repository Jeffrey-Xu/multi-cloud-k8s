const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const redis = require('redis');
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');
const NotificationManager = require('./services/notificationManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3004;

// Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.connect();

// Initialize notification manager
const notificationManager = new NotificationManager(redisClient, io);

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make services available to routes
app.use((req, res, next) => {
  req.redisClient = redisClient;
  req.notificationManager = notificationManager;
  req.io = io;
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected for notifications:', socket.id);

  socket.on('subscribe', async (data) => {
    const { userId, gameId } = data;
    
    // Join user-specific room
    if (userId) {
      socket.join(`user:${userId}`);
      await notificationManager.registerUserSocket(userId, socket.id);
    }
    
    // Join game-specific room
    if (gameId) {
      socket.join(`game:${gameId}`);
    }
    
    socket.emit('subscribed', { userId, gameId });
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected from notifications:', socket.id);
    await notificationManager.unregisterSocket(socket.id);
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
  console.log(`Notification Service running on port ${PORT}`);
});

module.exports = { app, server };
