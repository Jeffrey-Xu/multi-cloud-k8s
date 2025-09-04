# Monopoly Game Engine

## Overview
Core game engine microservice for the Monopoly Go multiplayer gaming platform.

## Features
- **Real-time Multiplayer**: WebSocket-based gameplay
- **RESTful API**: Game management and player actions
- **Scalable Architecture**: Kubernetes-ready microservice
- **Multi-platform**: Supports both AMD64 and ARM64 architectures

## API Endpoints

### Health Check
```
GET /health
```

### Game Management
```
POST /games              # Create new game
GET /games/:id           # Get game state
POST /games/:id/join     # Join game
POST /games/:id/roll     # Roll dice and move
```

## WebSocket Events
- `joinGame` - Join game room
- `gameUpdate` - Real-time game state updates
- `playerJoined` - New player notifications
- `playerDisconnected` - Player disconnect events

## Development

### Local Development
```bash
npm install
npm run dev
```

### Docker Build
```bash
docker build -t monopoly-game-engine .
docker run -p 3001:3001 monopoly-game-engine
```

### Testing
```bash
npm test
npm run lint
```

## Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## CI/CD
This service is automatically built and deployed via GitHub Actions:
- **CI**: Builds multi-arch Docker images on code changes
- **CD**: Deployed to Kubernetes via ArgoCD

Built with ❤️ for the global gaming community!
