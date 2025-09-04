# Database Schema Alignment Analysis

## Current Database Configuration Issues

### Infrastructure vs Application Mismatch
- **Infrastructure Database**: `monopoly_game` (from Terraform output)
- **User Service Configuration**: `monopoly_users` (from k8s/user-service.yaml)
- **Database Endpoint**: `monopoly-dev-postgres.cvyiwy84o2kj.us-west-2.rds.amazonaws.com:5432`

## Required Database Schema

### Core Database: `monopoly_game`

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- User statistics
CREATE TABLE user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_money_earned BIGINT DEFAULT 0,
    properties_owned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, completed, cancelled
    max_players INTEGER DEFAULT 4,
    current_players INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner_id INTEGER REFERENCES users(id),
    game_settings JSONB DEFAULT '{}'
);

-- Game players
CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    player_position INTEGER, -- 1-4
    current_money INTEGER DEFAULT 1500,
    current_position INTEGER DEFAULT 0, -- board position 0-39
    is_bankrupt BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, player_position)
);

-- Properties
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position INTEGER UNIQUE NOT NULL, -- board position 0-39
    property_type VARCHAR(20) NOT NULL, -- street, railroad, utility, special
    color_group VARCHAR(20),
    price INTEGER,
    rent_base INTEGER,
    rent_with_house_1 INTEGER,
    rent_with_house_2 INTEGER,
    rent_with_house_3 INTEGER,
    rent_with_house_4 INTEGER,
    rent_with_hotel INTEGER,
    house_cost INTEGER,
    mortgage_value INTEGER
);

-- Property ownership
CREATE TABLE property_ownership (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id),
    owner_id INTEGER REFERENCES users(id),
    houses INTEGER DEFAULT 0,
    hotels INTEGER DEFAULT 0,
    is_mortgaged BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, property_id)
);

-- Game events/transactions
CREATE TABLE game_events (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- move, buy_property, pay_rent, etc.
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchmaking queue
CREATE TABLE matchmaking_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_level INTEGER DEFAULT 1000,
    preferred_game_mode VARCHAR(20) DEFAULT 'classic',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- game_invite, game_start, turn_reminder, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_property_ownership_game_id ON property_ownership(game_id);
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

## Configuration Fixes Required

### 1. Update User Service Database Configuration

```yaml
# k8s/user-service.yaml - Fix DB_NAME
- name: DB_NAME
  value: "monopoly_game"  # Changed from "monopoly_users"
```

### 2. Service Database Connections

All services should connect to the same database with different table access:

- **User Service**: `users`, `user_stats`, `notifications`
- **Game Engine**: `games`, `game_players`, `properties`, `property_ownership`, `game_events`
- **Matchmaking Service**: `matchmaking_queue`, `games`, `game_players`
- **Notification Service**: `notifications`, `users`

### 3. Database Initialization Script

```sql
-- Insert default properties (Monopoly board)
INSERT INTO properties (name, position, property_type, color_group, price, rent_base, house_cost, mortgage_value) VALUES
('GO', 0, 'special', NULL, NULL, NULL, NULL, NULL),
('Mediterranean Avenue', 1, 'street', 'brown', 60, 2, 50, 30),
('Community Chest', 2, 'special', NULL, NULL, NULL, NULL, NULL),
('Baltic Avenue', 3, 'street', 'brown', 60, 4, 50, 30),
('Income Tax', 4, 'special', NULL, NULL, NULL, NULL, NULL),
('Reading Railroad', 5, 'railroad', NULL, 200, 25, NULL, 100),
-- ... (continue with all 40 board positions)
;
```

## Service Environment Variables Alignment

### Common Database Configuration
```yaml
env:
- name: DB_HOST
  value: "monopoly-postgres.monopoly-game.svc.cluster.local"
- name: DB_PORT
  value: "5432"
- name: DB_NAME
  value: "monopoly_game"  # Consistent across all services
- name: DB_USER
  valueFrom:
    secretKeyRef:
      name: postgres-secret
      key: username
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: postgres-secret
      key: password
```

## Migration Strategy

1. **Update Kubernetes configurations** to use correct database name
2. **Create database schema** using the SQL above
3. **Restart services** to pick up new configuration
4. **Verify connectivity** through health endpoints

## Health Check Endpoints

Each service should verify database connectivity:

```javascript
// Health check example
app.get('/health/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});
```

## Next Steps

1. Apply database name fix to user-service.yaml
2. Create and run database initialization script
3. Restart all services
4. Verify health endpoints return 200 status
5. Test end-to-end functionality
