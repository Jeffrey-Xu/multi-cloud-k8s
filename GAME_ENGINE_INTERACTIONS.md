# Game Engine Service - Interactions & Dependencies

## Current State Analysis

**⚠️ IMPORTANT**: The Game Engine is currently **NOT connected** to any AWS resources. It uses in-memory storage only.

## Game Engine Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Game Engine Service                                │
│                                Port: 3001                                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Current Implementation                             │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │ │
│  │  │   REST API      │    │   WebSocket     │    │   In-Memory Storage     │ │ │
│  │  │                 │    │   Server        │    │                         │ │ │
│  │  │ • POST /games   │    │                 │    │ • games = new Map()     │ │ │
│  │  │ • GET /games/:id│    │ • playerJoined  │    │ • players = new Map()   │ │ │
│  │  │ • POST /join    │    │ • gameUpdate    │    │                         │ │ │
│  │  │ • POST /roll    │    │ • connection    │    │ ⚠️  Data lost on restart│ │ │
│  │  │ • GET /health   │    │ • disconnect    │    │                         │ │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
└────────────────────────────────────────┼───────────────────────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │            Application Load Balancer    │
                    │            Route: /api/game/*           │
                    └─────────────────────────────────────────┘
```

## Planned vs Current Interactions

### 🔴 **MISSING**: Database Connections
```
Game Engine ──❌──> PostgreSQL (RDS)
                    │
                    ├── Game Sessions Table
                    ├── Game State Table  
                    ├── Player Moves Table
                    └── Game History Table
```

**Current**: Uses `games = new Map()` and `players = new Map()` (in-memory only)
**Should be**: Persistent storage in PostgreSQL for game state and history

### 🔴 **MISSING**: Redis Connections  
```
Game Engine ──❌──> Redis (ElastiCache)
                    │
                    ├── Active Game Sessions
                    ├── Real-time Game State
                    ├── Player Presence
                    └── Game Event Cache
```

**Current**: No Redis integration
**Should be**: Redis for real-time game state and session management

### 🟡 **PARTIAL**: Service-to-Service Communication
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Game Engine   │    │  User Service   │    │ Matchmaking     │
│                 │    │                 │    │ Service         │
│                 │    │                 │    │                 │
│ ❌ No Auth      │◄──▶│ ✅ JWT Auth     │    │ ❌ No Game     │
│ ❌ No User      │    │ ✅ User Profiles│    │    Integration │
│    Validation   │    │ ✅ Statistics   │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         │              │  Notification   │             │
         │              │  Service        │             │
         │              │                 │             │
         └──────────────►│ ❌ No Game     │◄────────────┘
                        │    Events       │
                        │                 │
                        └─────────────────┘
```

## Required Integration Architecture

### 1. **Database Integration (PostgreSQL)**
```sql
-- Required Tables for Game Engine
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    max_players INTEGER DEFAULT 4,
    current_turn INTEGER DEFAULT 0
);

CREATE TABLE game_players (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES game_sessions(id),
    user_id UUID NOT NULL,
    player_name VARCHAR(100),
    position INTEGER DEFAULT 0,
    money INTEGER DEFAULT 1500,
    properties JSONB DEFAULT '[]',
    joined_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE game_moves (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES game_sessions(id),
    player_id UUID REFERENCES game_players(id),
    move_type VARCHAR(50),
    move_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Redis Integration (ElastiCache)**
```javascript
// Required Redis Data Structures
const redis = require('redis');
const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Game state cache
await client.hSet(`game:${gameId}`, {
  status: 'active',
  currentPlayer: playerId,
  lastUpdate: Date.now()
});

// Player presence
await client.sAdd(`game:${gameId}:players`, playerId);
await client.expire(`player:${playerId}:heartbeat`, 30);
```

### 3. **Service Communication**
```javascript
// User Service Integration
const validateUser = async (userId, token) => {
  const response = await fetch(`http://user-service:3002/api/users/${userId}/validate`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Matchmaking Service Integration  
const notifyGameReady = async (gameId, players) => {
  await fetch(`http://matchmaking-service:3003/api/games/${gameId}/ready`, {
    method: 'POST',
    body: JSON.stringify({ players })
  });
};

// Notification Service Integration
const sendGameEvent = async (gameId, event) => {
  await fetch(`http://notification-service:3004/api/notify/game-event`, {
    method: 'POST',
    body: JSON.stringify({ gameId, event })
  });
};
```

## Current API Endpoints

### ✅ **Working Endpoints**:
- `GET /health` - Health check with game statistics
- `POST /games` - Create new game (in-memory)
- `GET /games/:gameId` - Get game state (in-memory)
- `POST /games/:gameId/join` - Join game (in-memory)
- `POST /games/:gameId/roll` - Roll dice and move (in-memory)

### ❌ **Missing Endpoints**:
- `POST /games/:gameId/leave` - Leave game
- `POST /games/:gameId/buy` - Buy property
- `POST /games/:gameId/trade` - Trade with players
- `GET /games/:gameId/history` - Game move history
- `POST /games/:gameId/end` - End game

## WebSocket Events

### ✅ **Current Events**:
- `playerJoined` - When player joins game
- `gameUpdate` - When game state changes
- `connection` - Player connects
- `disconnect` - Player disconnects

### ❌ **Missing Events**:
- `playerLeft` - When player leaves
- `gameEnded` - When game ends
- `propertyBought` - Property purchase
- `tradeProposed` - Trade between players
- `chatMessage` - In-game chat

## Deployment Configuration Issues

**Current YAML has placeholders**:
```yaml
env:
- name: DB_HOST
  value: "TERRAFORM_RDS_ENDPOINT"  # ❌ Not replaced
- name: REDIS_HOST  
  value: "TERRAFORM_REDIS_ENDPOINT" # ❌ Not replaced
```

**Should be** (via CI-generated manifest):
```yaml
env:
- name: DB_HOST
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: host
- name: REDIS_HOST
  value: "monopoly-dev-redis.f2xiko.ng.0001.usw2.cache.amazonaws.com"
```

## Summary

**Current State**: Game Engine is a **standalone service** with no external dependencies
**Required State**: Game Engine should be the **central orchestrator** connecting all services and AWS resources

**Priority Fixes**:
1. 🔥 **Add database persistence** - Connect to PostgreSQL RDS
2. 🔥 **Add Redis caching** - Connect to ElastiCache  
3. 🔥 **Add service authentication** - Integrate with User Service
4. 🔥 **Add event notifications** - Integrate with Notification Service
5. 🔥 **Add matchmaking integration** - Connect with Matchmaking Service
