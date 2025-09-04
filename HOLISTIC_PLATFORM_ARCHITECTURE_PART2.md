# Kubernetes Application Layer

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    KUBERNETES CLUSTER (EKS)                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                  INGRESS LAYER                                                             │   │
│  │                                                                                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐     │   │
│  │  │                          AWS LOAD BALANCER CONTROLLER                                             │     │   │
│  │  │                                                                                                   │     │   │
│  │  │  Internet → ALB → Target Groups → Kubernetes Services                                            │     │   │
│  │  │                                                                                                   │     │   │
│  │  │  Routes:                                                                                          │     │   │
│  │  │  • monopoly.game.com/          → Frontend Service (React App)                                    │     │   │
│  │  │  • monopoly.game.com/api/game  → Game Engine Service                                             │     │   │
│  │  │  • monopoly.game.com/api/user  → User Service                                                    │     │   │
│  │  │  • monopoly.game.com/ws        → WebSocket (Game Engine)                                         │     │   │
│  │  │                                                                                                   │     │   │
│  │  │  SSL/TLS: AWS Certificate Manager                                                                │     │   │
│  │  │  Health Checks: /health endpoints                                                                │     │   │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                     │                                                             │
│                                                     ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                MICROSERVICES LAYER                                                         │   │
│  │                                                                                                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                     │   │
│  │  │   FRONTEND      │  │  GAME ENGINE    │  │  USER SERVICE   │  │  MATCHMAKING    │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ Next.js React   │  │ Node.js + WS    │  │ Node.js + Auth  │  │ Node.js + Queue │                     │   │
│  │  │ Static Assets   │  │ Game Logic      │  │ JWT Tokens      │  │ Player Pairing  │                     │   │
│  │  │ 3 replicas      │  │ 3 replicas      │  │ 2 replicas      │  │ 2 replicas      │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ Resources:      │  │ Resources:      │  │ Resources:      │  │ Resources:      │                     │   │
│  │  │ 100m CPU        │  │ 500m CPU        │  │ 200m CPU        │  │ 200m CPU        │                     │   │
│  │  │ 256Mi RAM       │  │ 512Mi RAM       │  │ 256Mi RAM       │  │ 256Mi RAM       │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ Port: 3000      │  │ Port: 3001      │  │ Port: 3002      │  │ Port: 3003      │                     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘                     │   │
│  │           │                     │                     │                     │                            │   │
│  │           └─────────────────────┼─────────────────────┼─────────────────────┘                            │   │
│  │                                 │                     │                                                  │   │
│  │  ┌─────────────────────────────┼─────────────────────┼──────────────────────────────────────────────┐   │   │
│  │  │                    SERVICE MESH (Future)          │                                              │   │   │
│  │  │                                 │                     │                                              │   │   │
│  │  │  • Service-to-service communication                                                                │   │   │
│  │  │  • Load balancing and failover                                                                    │   │   │
│  │  │  • Observability and tracing                                                                      │   │   │
│  │  │  • Security policies                                                                              │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATA LAYER                                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                 PERSISTENT STORAGE                                                         │   │
│  │                                                                                                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                     │   │
│  │  │   RDS PRIMARY   │  │ ELASTICACHE     │  │   S3 BUCKETS    │  │   EBS VOLUMES   │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ PostgreSQL 15   │  │ Redis 7.0       │  │ Game Assets     │  │ Node Storage    │                     │   │
│  │  │ db.t3.micro     │  │ cache.t3.micro  │  │ Player Avatars  │  │ 50GB gp3        │                     │   │
│  │  │ 20GB storage    │  │ 1GB memory      │  │ Logs & Backups  │  │ Per node        │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ Tables:         │  │ Use Cases:      │  │ Buckets:        │  │ Mount Points:   │                     │   │
│  │  │ • users         │  │ • Game sessions │  │ • assets-bucket │  │ • /var/lib      │                     │   │
│  │  │ • games         │  │ • Player cache  │  │ • logs-bucket   │  │ • /tmp          │                     │   │
│  │  │ • game_history  │  │ • Leaderboards  │  │ • backup-bucket │  │                 │                     │   │
│  │  │ • player_stats  │  │ • Rate limiting │  │                 │  │                 │                     │   │
│  │  │                 │  │                 │  │                 │  │                 │                     │   │
│  │  │ Backup: 7 days  │  │ Backup: Daily   │  │ Lifecycle: 90d  │  │ Snapshots: Yes  │                     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## **Service Exposure & Player Access Flow**

### **Player Journey: From Browser to Game**

```
1. PLAYER TYPES URL
   monopoly.game.com
   │
   ▼
2. DNS RESOLUTION
   Route 53 → CloudFront Edge Location
   │
   ▼
3. CDN CACHE CHECK
   Static assets (JS/CSS/Images) served from edge
   API calls forwarded to origin
   │
   ▼
4. LOAD BALANCER
   Application Load Balancer (ALB)
   SSL termination, health checks
   │
   ▼
5. KUBERNETES INGRESS
   AWS Load Balancer Controller
   Routes traffic to appropriate service
   │
   ▼
6. SERVICE ROUTING
   ├── / → Frontend Service (React App)
   ├── /api/game → Game Engine Service
   ├── /api/user → User Service  
   └── /ws → WebSocket (Game Engine)
   │
   ▼
7. POD SELECTION
   Kubernetes Service selects healthy pod
   Load balances across replicas
   │
   ▼
8. APPLICATION PROCESSING
   Microservice processes request
   Connects to database/cache as needed
   │
   ▼
9. RESPONSE BACK TO PLAYER
   Same path in reverse
```
