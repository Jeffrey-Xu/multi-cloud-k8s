-- Monopoly Game Database Schema
-- Database: monopoly_game

-- Users table
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS user_stats (
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
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
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
CREATE TABLE IF NOT EXISTS game_players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    player_position INTEGER,
    current_money INTEGER DEFAULT 1500,
    current_position INTEGER DEFAULT 0,
    is_bankrupt BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, player_position)
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position INTEGER UNIQUE NOT NULL,
    property_type VARCHAR(20) NOT NULL,
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
CREATE TABLE IF NOT EXISTS property_ownership (
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
CREATE TABLE IF NOT EXISTS game_events (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_level INTEGER DEFAULT 1000,
    preferred_game_mode VARCHAR(20) DEFAULT 'classic',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_game_id ON property_ownership(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert Monopoly board properties
INSERT INTO properties (name, position, property_type, color_group, price, rent_base, rent_with_house_1, rent_with_house_2, rent_with_house_3, rent_with_house_4, rent_with_hotel, house_cost, mortgage_value) VALUES
('GO', 0, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Mediterranean Avenue', 1, 'street', 'brown', 60, 2, 10, 30, 90, 160, 250, 50, 30),
('Community Chest', 2, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Baltic Avenue', 3, 'street', 'brown', 60, 4, 20, 60, 180, 320, 450, 50, 30),
('Income Tax', 4, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Reading Railroad', 5, 'railroad', NULL, 200, 25, 50, 100, 200, NULL, NULL, NULL, 100),
('Oriental Avenue', 6, 'street', 'light_blue', 100, 6, 30, 90, 270, 400, 550, 50, 50),
('Chance', 7, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Vermont Avenue', 8, 'street', 'light_blue', 100, 6, 30, 90, 270, 400, 550, 50, 50),
('Connecticut Avenue', 9, 'street', 'light_blue', 120, 8, 40, 100, 300, 450, 600, 50, 60),
('Jail', 10, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('St. Charles Place', 11, 'street', 'pink', 140, 10, 50, 150, 450, 625, 750, 100, 70),
('Electric Company', 12, 'utility', NULL, 150, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75),
('States Avenue', 13, 'street', 'pink', 140, 10, 50, 150, 450, 625, 750, 100, 70),
('Virginia Avenue', 14, 'street', 'pink', 160, 12, 60, 180, 500, 700, 900, 100, 80),
('Pennsylvania Railroad', 15, 'railroad', NULL, 200, 25, 50, 100, 200, NULL, NULL, NULL, 100),
('St. James Place', 16, 'street', 'orange', 180, 14, 70, 200, 550, 750, 950, 100, 90),
('Community Chest', 17, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Tennessee Avenue', 18, 'street', 'orange', 180, 14, 70, 200, 550, 750, 950, 100, 90),
('New York Avenue', 19, 'street', 'orange', 200, 16, 80, 220, 600, 800, 1000, 100, 100),
('Free Parking', 20, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Kentucky Avenue', 21, 'street', 'red', 220, 18, 90, 250, 700, 875, 1050, 150, 110),
('Chance', 22, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Indiana Avenue', 23, 'street', 'red', 220, 18, 90, 250, 700, 875, 1050, 150, 110),
('Illinois Avenue', 24, 'street', 'red', 240, 20, 100, 300, 750, 925, 1100, 150, 120),
('B&O Railroad', 25, 'railroad', NULL, 200, 25, 50, 100, 200, NULL, NULL, NULL, 100),
('Atlantic Avenue', 26, 'street', 'yellow', 260, 22, 110, 330, 800, 975, 1150, 150, 130),
('Ventnor Avenue', 27, 'street', 'yellow', 260, 22, 110, 330, 800, 975, 1150, 150, 130),
('Water Works', 28, 'utility', NULL, 150, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75),
('Marvin Gardens', 29, 'street', 'yellow', 280, 24, 120, 360, 850, 1025, 1200, 150, 140),
('Go To Jail', 30, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Pacific Avenue', 31, 'street', 'green', 300, 26, 130, 390, 900, 1100, 1275, 200, 150),
('North Carolina Avenue', 32, 'street', 'green', 300, 26, 130, 390, 900, 1100, 1275, 200, 150),
('Community Chest', 33, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Pennsylvania Avenue', 34, 'street', 'green', 320, 28, 150, 450, 1000, 1200, 1400, 200, 160),
('Short Line Railroad', 35, 'railroad', NULL, 200, 25, 50, 100, 200, NULL, NULL, NULL, 100),
('Chance', 36, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Park Place', 37, 'street', 'dark_blue', 350, 35, 175, 500, 1100, 1300, 1500, 200, 175),
('Luxury Tax', 38, 'special', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('Boardwalk', 39, 'street', 'dark_blue', 400, 50, 200, 600, 1400, 1700, 2000, 200, 200)
ON CONFLICT (position) DO NOTHING;
