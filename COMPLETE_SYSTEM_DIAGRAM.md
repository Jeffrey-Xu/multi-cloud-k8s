# Monopoly Gaming Platform - Complete System Architecture

## High-Level System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND LAYER                                 │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Next.js Frontend App                              │ │
│  │                                                                             │ │
│  │  • Game Board UI          • Player Authentication    • Real-time Updates   │ │
│  │  • Lobby Management       • Game Controls           • WebSocket Client     │ │
│  │  • Player Dashboard       • Statistics Display      • Responsive Design   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
└────────────────────────────────────────┼───────────────────────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │         Application Load Balancer       │
                    │              (AWS ALB)                  │
                    │                                         │
                    │  SSL Termination + Path-based Routing  │
                    └─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼───────────────────────────────────────┐
│                              MICROSERVICES LAYER                               │
│                                        │                                       │
│  ┌─────────────────────────────────────▼───────────────────────────────────────┐ │
│  │                            API Gateway Routes                              │ │
│  │                                                                             │ │
│  │  /api/auth/*     → User Service      /api/game/*     → Game Engine         │ │
│  │  /api/users/*    → User Service      /api/match/*    → Matchmaking         │ │
│  │  /api/notify/*   → Notification      /ws             → WebSocket Hub       │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│  ┌─────────────────┬──────────────────┬┼┬──────────────────┬─────────────────┐ │
│  │                 │                  ││                  │                 │ │
│  ▼                 ▼                  ▼▼                  ▼                 ▼ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │    User     │ │    Game     │ │Matchmaking  │ │Notification │ │   Ingress   │ │
│ │   Service   │ │   Engine    │ │   Service   │ │   Service   │ │ Controller  │ │
│ │             │ │             │ │             │ │             │ │             │ │
│ │ Port: 3002  │ │ Port: 3001  │ │ Port: 3003  │ │ Port: 3004  │ │ Port: 80/443│ │
│ │ Replicas: 1 │ │ Replicas: 2 │ │ Replicas: 1 │ │ Replicas: 1 │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Service Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE COMMUNICATION MATRIX                         │
│                                                                                 │
│  ┌─────────────┐    HTTP/REST     ┌─────────────┐    HTTP/REST     ┌─────────────┐ │
│  │    User     │◄────────────────►│    Game     │◄────────────────►│Matchmaking  │ │
│  │   Service   │                  │   Engine    │                  │   Service   │ │
│  │             │                  │             │                  │             │ │
│  │ • Auth      │                  │ • Game Logic│                  │ • Queues    │ │
│  │ • Profiles  │                  │ • State Mgmt│                  │ • Matching  │ │
│  │ • Stats     │                  │ • Rules     │                  │ • Lobbies   │ │
│  └─────────────┘                  └─────────────┘                  └─────────────┘ │
│         │                                │                                │       │
│         │ HTTP/REST                      │ HTTP/REST                      │       │
│         │                                │                                │       │
│         ▼                                ▼                                ▼       │
│  ┌─────────────┐    WebSocket      ┌─────────────┐    WebSocket      ┌─────────────┐ │
│  │Notification │◄────────────────►│   Frontend  │◄────────────────►│   Redis     │ │
│  │   Service   │                  │    Client   │                  │   Cache     │ │
│  │             │                  │             │                  │             │ │
│  │ • Push      │                  │ • Real-time │                  │ • Sessions  │ │
│  │ • Email     │                  │ • Updates   │                  │ • Queues    │ │
│  │ • SMS       │                  │ • Events    │                  │ • Messages  │ │
│  └─────────────┘                  └─────────────┘                  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA PERSISTENCE LAYER                            │
│                                                                                 │
│  ┌─────────────────────────────┐              ┌─────────────────────────────────┐ │
│  │        PostgreSQL RDS       │              │       ElastiCache Redis         │ │
│  │     (Primary Database)      │              │      (Cache & Sessions)        │ │
│  │                             │              │                                 │ │
│  │ monopoly-dev-postgres.      │              │ monopoly-dev-redis.f2xiko.     │ │
│  │ cvyiwy84o2kj.us-west-2.     │              │ ng.0001.usw2.cache.             │ │
│  │ rds.amazonaws.com:5432      │              │ amazonaws.com:6379              │ │
│  │                             │              │                                 │ │
│  │ Database: monopoly_game     │              │ Used For:                       │ │
│  │                             │              │ • Player queues                 │ │
│  │ Tables:                     │              │ • Game sessions (cache)         │ │
│  │ ├── users                   │              │ • Real-time notifications       │ │
│  │ ├── user_profiles           │              │ • WebSocket connections         │ │
│  │ ├── user_statistics         │              │ • Matchmaking queues            │ │
│  │ ├── game_sessions           │              │ • Temporary game state          │ │
│  │ ├── game_players            │              │                                 │ │
│  │ ├── game_moves              │              │                                 │ │
│  │ └── game_history            │              │                                 │ │
│  └─────────────────────────────┘              └─────────────────────────────────┘ │
│              ▲                                              ▲                   │ │
│              │                                              │                   │ │
│              │ SSL Connection                               │ Direct Connection │ │
│              │                                              │                   │ │
└──────────────┼──────────────────────────────────────────────┼───────────────────┘
               │                                              │
    ┌──────────▼──────────┐                        ┌─────────▼──────────┐
    │   User Service      │                        │  Matchmaking +     │
    │   Game Engine       │                        │  Notification      │
    │                     │                        │  Services          │
    │   Connections:      │                        │                    │
    │   • User auth/data  │                        │   Connections:     │
    │   • Game persistence│                        │   • Player queues  │
    │   • Statistics      │                        │   • Session cache  │
    │   • Game history    │                        │   • Notifications  │
    └─────────────────────┘                        └────────────────────┘
```

## Detailed Service Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE RESPONSIBILITY MATRIX                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              USER SERVICE                                   │ │
│  │                                                                             │ │
│  │  Responsibilities:                    Dependencies:                         │ │
│  │  • User registration/login           • PostgreSQL RDS                      │ │
│  │  • JWT token generation              • Kubernetes Secrets                  │ │
│  │  • Profile management                                                       │ │
│  │  • Statistics tracking               API Endpoints:                        │ │
│  │  • Password hashing (bcrypt)         • POST /api/auth/register             │ │
│  │                                      • POST /api/auth/login               │ │
│  │  Health Checks:                      • GET  /api/users/profile             │ │
│  │  • /health/live                      • PUT  /api/users/profile             │ │
│  │  • /health/ready                     • GET  /api/users/stats               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              GAME ENGINE                                    │ │
│  │                                                                             │ │
│  │  Responsibilities:                    Dependencies:                         │ │
│  │  • Game state management             • PostgreSQL RDS (game data)          │ │
│  │  • Game rules enforcement            • Redis Cache (real-time state)       │ │
│  │  • Player move validation            • User Service (authentication)       │ │
│  │  • Game session lifecycle            • Notification Service (events)       │ │
│  │  • WebSocket real-time updates                                             │ │
│  │                                      API Endpoints:                        │ │
│  │  Health Checks:                      • POST /api/games                     │ │
│  │  • /health (DB + Redis status)       • GET  /api/games/:id                 │ │
│  │                                      • POST /api/games/:id/join            │ │
│  │                                      • POST /api/games/:id/move            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           MATCHMAKING SERVICE                               │ │
│  │                                                                             │ │
│  │  Responsibilities:                    Dependencies:                         │ │
│  │  • Player queue management           • Redis Cache (queues)                │ │
│  │  • Skill-based matching              • User Service (validation)           │ │
│  │  • Lobby creation                    • Game Engine (game creation)         │ │
│  │  • Real-time queue updates                                                 │ │
│  │  • Game mode selection               API Endpoints:                        │ │
│  │                                      • POST /api/match/queue               │ │
│  │  Health Checks:                      • DELETE /api/match/queue             │ │
│  │  • /health/live                      • GET  /api/match/status              │ │
│  │  • /health/ready                     • WebSocket events                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          NOTIFICATION SERVICE                               │ │
│  │                                                                             │ │
│  │  Responsibilities:                    Dependencies:                         │ │
│  │  • Real-time notifications           • Redis Cache (messages)              │ │
│  │  • Email notifications               • SMTP Server (email)                 │ │
│  │  • WebSocket management              • WebSocket connections               │ │
│  │  • Push notifications                                                       │ │
│  │  • Event broadcasting                API Endpoints:                        │ │
│  │                                      • POST /api/notify/send               │ │
│  │  Health Checks:                      • GET  /api/notify/status             │ │
│  │  • /health/live                      • WebSocket /ws/notifications         │ │
│  │  • /health/ready                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Complete Game Flow Sequence

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE GAME FLOW                                │
│                                                                                 │
│  1. USER REGISTRATION/LOGIN                                                     │
│     Frontend → ALB → User Service → PostgreSQL                                 │
│     ├── User registers/logs in                                                 │
│     ├── JWT token generated                                                    │
│     └── User profile created/retrieved                                         │
│                                                                                 │
│  2. MATCHMAKING PROCESS                                                         │
│     Frontend → ALB → Matchmaking Service → Redis + User Service + Game Engine  │
│     ├── Player joins queue (skill-based)                                       │
│     ├── Queue stored in Redis                                                  │
│     ├── User validated via User Service                                        │
│     ├── When enough players: Game created via Game Engine                      │
│     └── Players notified via Notification Service                              │
│                                                                                 │
│  3. GAME SESSION                                                                │
│     Frontend ↔ Game Engine ↔ PostgreSQL + Redis + Notification Service        │
│     ├── Game state persisted in PostgreSQL                                     │
│     ├── Real-time state cached in Redis                                        │
│     ├── Player moves validated and stored                                      │
│     ├── Game events broadcast via WebSocket                                    │
│     └── Notifications sent for game events                                     │
│                                                                                 │
│  4. REAL-TIME UPDATES                                                           │
│     All Services → Notification Service → WebSocket → Frontend                 │
│     ├── Game moves broadcast instantly                                         │
│     ├── Player join/leave notifications                                        │
│     ├── Game state changes                                                     │
│     └── System notifications                                                   │
│                                                                                 │
│  5. GAME COMPLETION                                                             │
│     Game Engine → PostgreSQL + User Service + Notification Service            │
│     ├── Final game state saved                                                 │
│     ├── Player statistics updated                                              │
│     ├── Game history recorded                                                  │
│     └── Results notifications sent                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Infrastructure Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS INFRASTRUCTURE                                 │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              EKS CLUSTER                                    │ │
│  │                         monopoly-dev-jxre                                   │ │
│  │                                                                             │ │
│  │  Node Groups:                         Networking:                          │ │
│  │  • 2-4 worker nodes                  • VPC: vpc-0d0152a7fb89c84d9          │ │
│  │  • t3.medium instances               • Public Subnets: 2                   │ │
│  │  • Auto-scaling enabled              • Private Subnets: 2                  │ │
│  │                                      • Internet Gateway                    │ │
│  │  Services:                           • NAT Gateway                         │ │
│  │  • AWS Load Balancer Controller      • Security Groups                     │ │
│  │  • EBS CSI Driver                                                          │ │
│  │  • CoreDNS                           Storage:                              │ │
│  │  • kube-proxy                        • EBS GP3 StorageClass                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            MANAGED SERVICES                                 │ │
│  │                                                                             │ │
│  │  RDS PostgreSQL:                      ElastiCache Redis:                   │ │
│  │  • Engine: PostgreSQL 15.4           • Engine: Redis 7.0                  │ │
│  │  • Instance: db.t3.micro             • Node: cache.t3.micro               │ │
│  │  • Multi-AZ: No (dev)                • Cluster Mode: Disabled             │ │
│  │  • Backup: 7 days                    • Encryption: At rest               │ │
│  │  • Encryption: At rest + transit     • Auth: No password (VPC)           │ │
│  │                                                                             │ │
│  │  S3 Buckets:                         Secrets Manager:                     │ │
│  │  • monopoly-dev-backups-jxre         • DB credentials                     │ │
│  │  • monopoly-dev-game-assets-jxre     • JWT secrets                        │ │
│  │  • monopoly-dev-logs-jxre            • API keys                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Current vs Target State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STATUS COMPARISON                                  │
│                                                                                 │
│  CURRENT STATE (What's Running):          TARGET STATE (What Should Be):       │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐   │
│  │ ✅ Infrastructure: Complete      │      │ ✅ Infrastructure: Complete      │   │
│  │ ✅ Game Engine: 2/2 (OLD)       │      │ ✅ Game Engine: 2/2 (NEW)       │   │
│  │ ❌ User Service: 0/1 (Failing)  │      │ ✅ User Service: 1/1 (Healthy)  │   │
│  │ ❌ Matchmaking: Not Deployed    │      │ ✅ Matchmaking: 1/1 (Healthy)   │   │
│  │ ❌ Notification: Not Deployed   │      │ ✅ Notification: 1/1 (Healthy)  │   │
│  │                                 │      │                                 │   │
│  │ Connections:                    │      │ Connections:                    │   │
│  │ • User Service ↔ PostgreSQL ✅  │      │ • All Services ↔ PostgreSQL ✅  │   │
│  │ • Game Engine: In-memory only  │      │ • All Services ↔ Redis ✅       │   │
│  │ • No Redis connections         │      │ • Service-to-Service HTTP ✅     │   │
│  │ • No service integration       │      │ • WebSocket real-time ✅        │   │
│  └─────────────────────────────────┘      └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**SUMMARY**: We have a complete microservices architecture designed with proper separation of concerns, database persistence, caching, and real-time capabilities. Currently in transition from old isolated services to new integrated architecture.
