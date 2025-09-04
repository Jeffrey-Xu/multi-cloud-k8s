# Monopoly Gaming Platform - System Architecture

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                AWS Cloud Infrastructure                          │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            EKS Cluster (monopoly-dev-jxre)                  │ │
│  │                                                                             │ │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │ │
│  │  │   Game Engine    │    │   User Service   │    │  Matchmaking     │      │ │
│  │  │   Port: 3001     │    │   Port: 3002     │    │  Service         │      │ │
│  │  │   Replicas: 2    │    │   Replicas: 1    │    │  Port: 3003      │      │ │
│  │  │                  │    │                  │    │  Replicas: 1     │      │ │
│  │  │  ┌─────────────┐ │    │  ┌─────────────┐ │    │  ┌─────────────┐ │      │ │
│  │  │  │ Health: /   │ │    │  │ Health:     │ │    │  │ Health:     │ │      │ │
│  │  │  │ /health     │ │    │  │ /health/    │ │    │  │ /health/    │ │      │ │
│  │  │  │             │ │    │  │ live/ready  │ │    │  │ live/ready  │ │      │ │
│  │  │  └─────────────┘ │    │  └─────────────┘ │    │  └─────────────┘ │      │ │
│  │  └──────────────────┘    └──────────────────┘    └──────────────────┘      │ │
│  │           │                        │                        │               │ │
│  │           │                        │                        │               │ │
│  │  ┌──────────────────┐              │                        │               │ │
│  │  │  Notification    │              │                        │               │ │
│  │  │  Service         │              │                        │               │ │
│  │  │  Port: 3004      │              │                        │               │ │
│  │  │  Replicas: 1     │              │                        │               │ │
│  │  │                  │              │                        │               │ │
│  │  │  ┌─────────────┐ │              │                        │               │ │
│  │  │  │ WebSocket + │ │              │                        │               │ │
│  │  │  │ Email       │ │              │                        │               │ │
│  │  │  │ Integration │ │              │                        │               │ │
│  │  │  └─────────────┘ │              │                        │               │ │
│  │  └──────────────────┘              │                        │               │ │
│  │           │                        │                        │               │ │
│  └───────────┼────────────────────────┼────────────────────────┼───────────────┘ │
│              │                        │                        │                 │
│              │                        │                        │                 │
│  ┌───────────▼────────────────────────▼────────────────────────▼───────────────┐ │
│  │                          Application Load Balancer                          │ │
│  │                         (AWS ALB + Ingress Controller)                      │ │
│  │                                                                             │ │
│  │  Routes:                                                                    │ │
│  │  • /api/auth/*     → User Service (3002)                                   │ │
│  │  • /api/users/*    → User Service (3002)                                   │ │
│  │  • /api/game/*     → Game Engine (3001)                                    │ │
│  │  • /api/match/*    → Matchmaking Service (3003)                            │ │
│  │  • /api/notify/*   → Notification Service (3004)                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
└────────────────────────────────────────┼───────────────────────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │              Internet Gateway            │
                    │            (Public Access)              │
                    └─────────────────────────────────────────┘
```

## Data Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Managed Services                               │
│                                                                                 │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │        Amazon RDS           │    │           ElastiCache Redis             │ │
│  │     (PostgreSQL 15.4)       │    │         (Redis 7.0)                    │ │
│  │                             │    │                                         │ │
│  │  Database: monopoly_game    │    │  Endpoint: monopoly-dev-redis.          │ │
│  │  Endpoint: monopoly-dev-    │    │  f2xiko.ng.0001.usw2.cache.            │ │
│  │  postgres.cvyiwy84o2kj.     │    │  amazonaws.com                          │ │
│  │  us-west-2.rds.amazonaws.com│    │  Port: 6379                             │ │
│  │  Port: 5432                 │    │                                         │ │
│  │                             │    │  Used by:                               │ │
│  │  Used by:                   │    │  • Matchmaking Service (queues)         │ │
│  │  • User Service (auth,      │    │  • Notification Service (messages)      │ │
│  │    profiles, stats)         │    │                                         │ │
│  │                             │    │                                         │ │
│  │  Tables:                    │    │  Data Types:                            │ │
│  │  • users                    │    │  • Player queues                        │ │
│  │  • user_profiles            │    │  • Game sessions                        │ │
│  │  • user_statistics          │    │  • Notification cache                   │ │
│  │  • game_sessions            │    │  • Real-time events                     │ │
│  └─────────────────────────────┘    └─────────────────────────────────────────┘ │
│              ▲                                           ▲                     │
│              │                                           │                     │
│              │ SSL Connection                            │ Direct Connection   │
│              │ (SSL: rejectUnauthorized: false)          │                     │
│              │                                           │                     │
└──────────────┼───────────────────────────────────────────┼─────────────────────┘
               │                                           │
               │                                           │
    ┌──────────▼──────────┐                    ┌──────────▼──────────┐
    │   User Service      │                    │  Matchmaking +      │
    │   (Database Client) │                    │  Notification       │
    │                     │                    │  Services           │
    │   • pg (PostgreSQL) │                    │  (Redis Clients)    │
    │   • SSL enabled     │                    │                     │
    │   • Connection pool │                    │  • redis v4+        │
    └─────────────────────┘                    │  • Socket config    │
                                               └─────────────────────┘
```

## Storage & Backup Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Amazon S3 Buckets                                 │
│                                                                                 │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │   monopoly-dev-backups-jxre │    │   monopoly-dev-game-assets-jxre        │ │
│  │                             │    │                                         │ │
│  │   Purpose:                  │    │   Purpose:                              │ │
│  │   • Database backups        │    │   • Game board images                  │ │
│  │   • Configuration backups   │    │   • Card assets                        │ │
│  │   • Disaster recovery       │    │   • UI components                      │ │
│  │                             │    │   • Static game content                │ │
│  └─────────────────────────────┘    └─────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    monopoly-dev-logs-jxre                                   │ │
│  │                                                                             │ │
│  │   Purpose:                                                                  │ │
│  │   • Application logs from all services                                     │ │
│  │   • EKS cluster logs                                                       │ │
│  │   • Load balancer access logs                                              │ │
│  │   • Audit trails                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Service Communication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │    │    Game     │    │ Matchmaking │    │Notification │
│   Service   │    │   Engine    │    │   Service   │    │   Service   │
│             │    │             │    │             │    │             │
│ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │
│ │ Auth    │ │    │ │ Game    │ │    │ │ Queue   │ │    │ │ WebSocket│ │
│ │ Profile │ │    │ │ Logic   │ │    │ │ Manager │ │    │ │ Email   │ │
│ │ Stats   │ │    │ │ State   │ │    │ │ Matching│ │    │ │ Push    │ │
│ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ PostgreSQL  │    │   Redis     │    │   Redis     │    │   Redis     │
│             │    │ (Sessions)  │    │ (Queues)    │    │ (Messages)  │
│ • Users     │    │             │    │             │    │             │
│ • Profiles  │    │             │    │             │    │ + SMTP      │
│ • Stats     │    │             │    │             │    │ (Email)     │
│ • Games     │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Infrastructure Components (Terraform Managed)

### Core Infrastructure:
- **VPC**: Custom VPC with public/private subnets
- **EKS Cluster**: `monopoly-dev-jxre` with managed node groups
- **RDS PostgreSQL**: `monopoly-dev-postgres` (Multi-AZ, encrypted)
- **ElastiCache Redis**: `monopoly-dev-redis` (Cluster mode disabled)
- **S3 Buckets**: 3 buckets for backups, assets, and logs
- **IAM Roles**: EKS service roles, node group roles, ALB controller role
- **Security Groups**: Database, Redis, and EKS security groups
- **Secrets Manager**: Database credentials storage

### Networking:
- **Application Load Balancer**: AWS ALB with Ingress Controller
- **Route 53**: DNS management (if configured)
- **Internet Gateway**: Public internet access
- **NAT Gateway**: Private subnet internet access

### Security:
- **SSL/TLS**: Database connections use SSL
- **Secrets**: Kubernetes secrets for DB credentials and JWT tokens
- **RBAC**: EKS role-based access control
- **Security Groups**: Restrictive network access rules

This architecture provides a scalable, secure, and maintainable gaming platform with proper separation of concerns and cloud-native best practices.
