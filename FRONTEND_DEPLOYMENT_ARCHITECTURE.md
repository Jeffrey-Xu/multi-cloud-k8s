# Frontend Deployment Architecture - Monopoly Gaming Platform

## Frontend Deployment Model: **Hybrid Architecture**

The frontend is deployed **BOTH** as a Kubernetes service AND runs in the browser:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND ARCHITECTURE                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          SERVER-SIDE (Kubernetes)                           │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                        Next.js Frontend Service                         │ │ │
│  │  │                           (Kubernetes Pod)                              │ │ │
│  │  │                                                                         │ │ │
│  │  │  • Server-Side Rendering (SSR)     • Static Asset Serving             │ │ │
│  │  │  • API Route Handlers               • SEO Optimization                 │ │ │
│  │  │  • Authentication Pages             • Performance Optimization         │ │ │
│  │  │  • Initial Page Load                • Security Headers                 │ │ │
│  │  │                                                                         │ │ │
│  │  │  Port: 3000                         Replicas: 2-3                      │ │ │
│  │  │  Health: /api/health                Load Balanced                      │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│                                        ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         CLIENT-SIDE (Browser)                              │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                        React Application                                │ │ │
│  │  │                        (Runs in Browser)                               │ │ │
│  │  │                                                                         │ │ │
│  │  │  • Interactive Game Board          • Real-time Updates                 │ │ │
│  │  │  • Player Actions                  • WebSocket Client                  │ │ │
│  │  │  • Game State Management           • State Management (Zustand)        │ │ │
│  │  │  • UI Interactions                 • Responsive Design                 │ │ │
│  │  │                                                                         │ │ │
│  │  │  Technologies:                     Connections:                        │ │ │
│  │  │  • React 18 + TypeScript           • HTTP API calls                    │ │ │
│  │  │  • Tailwind CSS                    • WebSocket (Socket.IO)             │ │ │
│  │  │  • Socket.IO Client                • Real-time game events             │ │ │
│  │  │  • Zustand (State)                 • Authentication tokens             │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT PROCESS                                 │
│                                                                                 │
│  1. BUILD PHASE (CI/CD)                                                         │
│     ┌─────────────────────────────────────────────────────────────────────────┐ │
│     │  GitHub Actions → Docker Build → Container Registry                     │ │
│     │                                                                         │ │
│     │  • npm run build (Next.js)         • Multi-stage Docker build          │ │
│     │  • Static optimization             • Production optimizations          │ │
│     │  • Bundle splitting                • Security hardening               │ │
│     │  • Asset compression               • Health check integration          │ │
│     └─────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│                                        ▼                                       │
│  2. DEPLOYMENT PHASE (Kubernetes)                                              │
│     ┌─────────────────────────────────────────────────────────────────────────┐ │
│     │  Kubernetes Deployment → Load Balancer → Public Access                 │ │
│     │                                                                         │ │
│     │  • Container orchestration         • SSL termination                   │ │
│     │  • Auto-scaling (2-3 replicas)     • CDN integration                   │ │
│     │  • Health monitoring               • Geographic distribution           │ │
│     │  • Rolling updates                 • Performance optimization          │ │
│     └─────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│                                        ▼                                       │
│  3. CLIENT DELIVERY (Browser)                                                  │
│     ┌─────────────────────────────────────────────────────────────────────────┐ │
│     │  Browser Request → HTML/CSS/JS → Interactive Application               │ │
│     │                                                                         │ │
│     │  • Initial page load (SSR)         • Progressive enhancement           │ │
│     │  • JavaScript hydration            • Offline capabilities              │ │
│     │  • Real-time connections           • Performance monitoring            │ │
│     │  • State synchronization           • Error tracking                    │ │
│     └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NETWORK FLOW                                      │
│                                                                                 │
│  ┌─────────────┐    HTTPS     ┌─────────────┐    HTTP      ┌─────────────┐      │
│  │   Player    │─────────────►│     ALB     │─────────────►│  Frontend   │      │
│  │   Browser   │              │ (Port 443)  │              │ Service     │      │
│  │             │              │             │              │ (Port 3000) │      │
│  │ • HTML/CSS  │              │ • SSL Term  │              │             │      │
│  │ • JavaScript│              │ • Routing   │              │ • SSR       │      │
│  │ • WebSocket │              │ • Security  │              │ • Static    │      │
│  └─────────────┘              └─────────────┘              └─────────────┘      │
│         │                                                         │            │
│         │ API Calls                                               │ Internal   │
│         │                                                         │ API Calls  │
│         ▼                                                         ▼            │
│  ┌─────────────┐              ┌─────────────┐              ┌─────────────┐      │
│  │   Backend   │◄─────────────│     ALB     │◄─────────────│  Frontend   │      │
│  │  Services   │   HTTP/WS    │  (API Routes│   HTTP       │   Service   │      │
│  │             │              │ /api/*)     │              │             │      │
│  │ • Game API  │              │             │              │ • Proxy     │      │
│  │ • User API  │              │ • Path      │              │ • Auth      │      │
│  │ • WebSocket │              │   Routing   │              │ • Session   │      │
│  └─────────────┘              └─────────────┘              └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Service Configuration

```yaml
# Frontend Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-service
  namespace: monopoly-game
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: jeffreyxu2025/monopoly-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://monopoly-game.example.com"
        - name: NEXT_PUBLIC_WS_URL  
          value: "wss://monopoly-game.example.com"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi" 
            cpu: "400m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: monopoly-game
spec:
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

## Client-Side Game Components

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER-SIDE COMPONENTS                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            Game Board UI                                    │ │
│  │                                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │   Player    │  │    Game     │  │  Property   │  │   Action    │        │ │
│  │  │  Dashboard  │  │   Board     │  │   Cards     │  │   Panel     │        │ │
│  │  │             │  │             │  │             │  │             │        │ │
│  │  │ • Avatar    │  │ • 40 Spaces │  │ • Ownership │  │ • Roll Dice │        │ │
│  │  │ • Money     │  │ • Players   │  │ • Prices    │  │ • Buy/Sell  │        │ │
│  │  │ • Properties│  │ • Pieces    │  │ • Rent      │  │ • Trade     │        │ │
│  │  │ • Stats     │  │ • Animation │  │ • Mortgage  │  │ • Chat      │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         Real-time Features                                  │ │
│  │                                                                             │ │
│  │  • Live player movements            • Instant notifications                │ │
│  │  • Real-time chat                   • Game state synchronization          │ │
│  │  • Turn indicators                  • Connection status                    │ │
│  │  • Animation effects                • Error handling                       │ │
│  │  • Sound effects                    • Offline detection                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Between Server and Client

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA SYNCHRONIZATION                              │
│                                                                                 │
│  SERVER-SIDE (K8s)                           CLIENT-SIDE (Browser)             │
│  ┌─────────────────────────┐                 ┌─────────────────────────┐       │
│  │    Next.js Server       │    Initial      │     React Client        │       │
│  │                         │    Page Load    │                         │       │
│  │ • SSR Game Lobby        │────────────────►│ • Hydrated Components   │       │
│  │ • Authentication        │                 │ • Interactive UI        │       │
│  │ • SEO Optimization      │                 │ • State Management      │       │
│  │ • Security Headers      │                 │ • Event Handlers        │       │
│  └─────────────────────────┘                 └─────────────────────────┘       │
│              │                                           │                     │
│              │ API Proxy                                 │ Direct API          │
│              ▼                                           ▼                     │
│  ┌─────────────────────────┐                 ┌─────────────────────────┐       │
│  │   Backend Services      │◄────────────────│    WebSocket Client     │       │
│  │                         │   Real-time     │                         │       │
│  │ • Game Engine           │   Updates       │ • Socket.IO Client      │       │
│  │ • User Service          │                 │ • Event Listeners       │       │
│  │ • Matchmaking           │                 │ • State Sync            │       │
│  │ • Notifications         │                 │ • Reconnection Logic    │       │
│  └─────────────────────────┘                 └─────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Summary

**Frontend Deployment Model:**

1. **Server-Side (Kubernetes)**:
   - Next.js application running as Kubernetes service
   - Handles SSR, authentication, API proxying
   - Load balanced, auto-scaled, health monitored
   - Serves initial HTML/CSS/JS to browsers

2. **Client-Side (Browser)**:
   - React application runs in player's browser
   - Interactive game board and real-time features
   - WebSocket connections for live updates
   - Local state management and UI interactions

**Benefits:**
- **Performance**: SSR for fast initial loads + client-side interactivity
- **Scalability**: Kubernetes handles server scaling, browsers handle client load
- **Security**: Server-side authentication + client-side session management
- **Real-time**: WebSocket connections for instant game updates
- **SEO**: Server-rendered pages for search engine optimization

The frontend is **both** a Kubernetes service (for serving and SSR) **and** a browser application (for interactivity and real-time features).
