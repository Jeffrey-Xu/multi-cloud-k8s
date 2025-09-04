# Monopoly Platform - ACTUAL Service Connections Analysis

## Comprehensive Service Dependencies (Based on Code Analysis)

### 📦 **Package Dependencies Analysis**

```
Game Engine:
├── express, socket.io, uuid, cors, helmet, morgan, dotenv
└── ❌ NO database/redis dependencies

User Service:
├── express, bcryptjs, jsonwebtoken, pg, cors, helmet
├── express-rate-limit, joi, uuid
└── ✅ PostgreSQL client (pg)

Matchmaking Service:
├── express, socket.io, redis, axios, cors, helmet
├── joi, uuid
├── ✅ Redis client (redis v4.6.7)
└── ✅ HTTP client for service calls (axios)

Notification Service:
├── express, socket.io, redis, nodemailer, cors, helmet
├── joi, uuid
├── ✅ Redis client (redis v4.6.7)
└── ✅ Email client (nodemailer)
```

## 🔗 **ACTUAL Service-to-Service Communication**

### **Matchmaking Service → Other Services**
```javascript
// 1. Matchmaking → User Service (Token Validation)
await axios.get(`${this.userServiceUrl}/api/users/profile`, {
  headers: { Authorization: `Bearer ${playerData.token}` }
});

// 2. Matchmaking → Game Engine (Game Creation)
await axios.post(`${this.gameEngineUrl}/api/games`, {
  gameId,
  gameMode,
  players: players.map(p => ({
    userId: p.userId,
    // ... player data
  }))
});

// Environment Variables:
// GAME_ENGINE_URL = 'http://game-engine-service:3001'
// USER_SERVICE_URL = 'http://user-service:3002'
```

### **Matchmaking Service → Game Engine Health Check**
```javascript
// Health endpoint checks game engine status
const gameEngineUrl = process.env.GAME_ENGINE_URL || 'http://game-engine-service:3001';
const response = await axios.get(`${gameEngineUrl}/health`, { timeout: 5000 });
```

### **Game Engine → Other Services**
```javascript
// ❌ NONE - Game Engine makes NO outbound service calls
// It only receives calls and uses in-memory storage
```

### **User Service → Other Services**
```javascript
// ❌ NONE - User Service is self-contained
// Only connects to PostgreSQL database
```

### **Notification Service → Other Services**
```javascript
// ❌ NO direct service calls
// Only uses Redis for message storage and SMTP for emails
```

## 🗄️ **ACTUAL Database Connections**

### **User Service ↔ PostgreSQL (RDS)**
```javascript
// Connection Configuration:
const pool = new Pool({
  host: process.env.DB_HOST,           // From secret: db-credentials.host
  port: process.env.DB_PORT,           // From secret: db-credentials.port  
  database: process.env.DB_NAME,       // "monopoly_game"
  user: process.env.DB_USER,           // From secret: db-credentials.username
  password: process.env.DB_PASSWORD,   // From secret: db-credentials.password
  ssl: { rejectUnauthorized: false }   // ✅ SSL enabled for RDS
});

// Actual Tables Used:
// - User authentication (login/register)
// - User profiles (GET/PUT /api/users/profile)  
// - User statistics (GET /api/users/stats)
```

### **Matchmaking Service ↔ Redis (ElastiCache)**
```javascript
// Connection Configuration:
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,      // monopoly-dev-redis.f2xiko...
    port: process.env.REDIS_PORT       // 6379
  }
});

// Actual Redis Usage:
// - Player queues: queue:${gameMode}:${skillLevel}
// - Player mapping: player:${socketId}
// - Queue management: lPush, rPop, lLen operations
```

### **Notification Service ↔ Redis (ElastiCache)**
```javascript
// Same Redis connection as Matchmaking
// Actual Redis Usage:
// - Socket mapping: socket:${socketId} → userId
// - User sockets: user_sockets:${userId} → Set of socketIds
// - Notification storage for offline users
```

### **Game Engine ↔ Storage**
```javascript
// ❌ NO persistent storage connections
// Uses in-memory Maps:
const games = new Map();      // All game state lost on restart
const players = new Map();    // All player data lost on restart
```

## 🌐 **ACTUAL Network Routing (ALB + Ingress)**

### **Current Ingress Configuration**
```yaml
# From existing infrastructure
paths:
- path: /api/auth/*
  backend: user-service:3002
- path: /api/users/*  
  backend: user-service:3002
- path: /api/game/*
  backend: game-engine-service:3001
- path: /api/match/*
  backend: matchmaking-service:3003  
- path: /api/notify/*
  backend: notification-service:3004
```

## 📊 **ACTUAL Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ACTUAL SYSTEM FLOW                                │
│                                                                                 │
│  Frontend ──────────────────► ALB ──────────────────► Services                 │
│                                │                                               │
│                                ├─ /api/auth/* ────► User Service              │
│                                │                      │                        │
│                                │                      ▼                        │
│                                │                 PostgreSQL RDS                │
│                                │                 (✅ Connected)                │
│                                │                                               │
│                                ├─ /api/match/* ───► Matchmaking Service       │
│                                │                      │           │            │
│                                │                      ▼           ▼            │
│                                │                 Redis Cache  HTTP Calls       │
│                                │                 (✅ Connected) │              │
│                                │                              │              │
│                                │                              ├─► User Service │
│                                │                              └─► Game Engine  │
│                                │                                               │
│                                ├─ /api/game/* ────► Game Engine               │
│                                │                      │                        │
│                                │                      ▼                        │
│                                │                 In-Memory Only                │
│                                │                 (❌ No Persistence)          │
│                                │                                               │
│                                └─ /api/notify/* ──► Notification Service      │
│                                                      │                        │
│                                                      ▼                        │
│                                                 Redis + SMTP                  │
│                                                 (✅ Connected)                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 **ACTUAL Environment Configuration**

### **Working Connections (✅)**
```yaml
User Service:
  DB_HOST: monopoly-dev-postgres.cvyiwy84o2kj.us-west-2.rds.amazonaws.com
  DB_PORT: 5432
  DB_NAME: monopoly_game
  DB_USER: monopoly_admin (from secret)
  DB_PASSWORD: ••••••••• (from secret)
  SSL: enabled

Matchmaking Service:
  REDIS_HOST: monopoly-dev-redis.f2xiko.ng.0001.usw2.cache.amazonaws.com
  REDIS_PORT: 6379
  GAME_ENGINE_URL: http://game-engine-service:3001
  USER_SERVICE_URL: http://user-service:3002

Notification Service:
  REDIS_HOST: monopoly-dev-redis.f2xiko.ng.0001.usw2.cache.amazonaws.com
  REDIS_PORT: 6379
  SMTP_HOST: smtp.gmail.com (configurable)
  FROM_EMAIL: noreply@monopolygame.com
```

### **Missing Connections (❌)**
```yaml
Game Engine:
  # Should have but doesn't:
  DB_HOST: ❌ Not connected to PostgreSQL
  REDIS_HOST: ❌ Not connected to Redis
  # Currently only has:
  PORT: 3001
  NODE_ENV: development
```

## 🎯 **Service Interaction Patterns**

### **1. User Authentication Flow**
```
Client → ALB → User Service → PostgreSQL
                    ↓
               JWT Token Generated
                    ↓
Client ← ALB ← User Service
```

### **2. Matchmaking Flow**  
```
Client → ALB → Matchmaking Service
                    ↓
              Validate Token → User Service
                    ↓
              Add to Queue → Redis
                    ↓
              Create Game → Game Engine (HTTP)
                    ↓
Client ← ALB ← Matchmaking Service
```

### **3. Game Play Flow**
```
Client → ALB → Game Engine
                    ↓
              In-Memory Processing
                    ↓
              WebSocket Events
                    ↓
Client ← WebSocket ← Game Engine
```

### **4. Notification Flow**
```
Service Event → Notification Service
                    ↓
              Store in Redis
                    ↓
              WebSocket + Email
                    ↓
Client ← WebSocket/Email ← Notification Service
```

## 🚨 **Critical Gaps Identified**

### **1. Game Engine Isolation**
- ❌ No database persistence (games lost on restart)
- ❌ No Redis integration (no real-time state sharing)
- ❌ No authentication integration (no user validation)
- ❌ No notification integration (no game event notifications)

### **2. Missing Service Integrations**
- ❌ Game Engine doesn't validate users with User Service
- ❌ Game Engine doesn't notify Notification Service of events
- ❌ No game state persistence across service restarts
- ❌ No integration with S3 for game assets/logs

### **3. Incomplete Data Architecture**
- ✅ User data persisted in PostgreSQL
- ✅ Matchmaking queues in Redis  
- ✅ Notifications in Redis
- ❌ Game state only in memory (critical gap)

## 📋 **Summary**

**Working Integrations:**
- User Service ↔ PostgreSQL (authentication, profiles)
- Matchmaking ↔ Redis (player queues)
- Matchmaking → User Service (token validation)
- Matchmaking → Game Engine (game creation)
- Notification ↔ Redis (message storage)
- All services ↔ ALB (routing)

**Missing Integrations:**
- Game Engine ↔ PostgreSQL (game persistence)
- Game Engine ↔ Redis (real-time state)
- Game Engine → Notification Service (game events)
- Any service ↔ S3 (asset/log storage)

**The system is partially connected but the Game Engine (core component) operates in isolation, making it unsuitable for production use.**
