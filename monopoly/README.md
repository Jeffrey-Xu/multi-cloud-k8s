# Monopoly Go - Multi-Cloud Game

A web-based multiplayer Monopoly-like game deployed on multi-cloud Kubernetes.

## Architecture

### Microservices
- **game-engine**: Core game logic and board state management
- **matchmaking**: Player pairing and lobby management  
- **user-service**: Authentication and user profiles
- **leaderboard**: Rankings and statistics
- **notification**: Real-time updates and messaging
- **frontend**: React web client

### Technology Stack
- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React, TypeScript, Socket.io-client
- **Database**: PostgreSQL + Redis
- **Deployment**: Kubernetes + Helm

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Game Features

### Core Gameplay
- Classic Monopoly board with 40 spaces
- Property buying, trading, and development
- Rent collection and bankruptcy mechanics
- Chance and Community Chest cards

### Multiplayer Features
- Real-time gameplay for 2-6 players
- Matchmaking system
- Spectator mode
- Chat functionality

### Progression System
- Player statistics and achievements
- Global leaderboards
- Seasonal tournaments
- Customizable avatars and themes

## Deployment

The game is deployed across multiple cloud providers:
- **AWS EKS**: Primary deployment region
- **Azure AKS**: Secondary region for redundancy
- **Consul**: Service mesh for cross-cloud communication
