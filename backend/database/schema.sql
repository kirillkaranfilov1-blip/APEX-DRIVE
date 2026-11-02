CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 15000 CHECK (credits >= 0),
    reputation INTEGER NOT NULL DEFAULT 0 CHECK (reputation >= 0),
    selected_vehicle_id TEXT NOT NULL DEFAULT 'nightrun-club-sport',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_vehicles (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL,
    acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_upgrades (
    player_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    upgrade_type TEXT NOT NULL CHECK (upgrade_type IN ('engine', 'transmission', 'tires', 'suspension', 'brakes')),
    level INTEGER NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
    PRIMARY KEY (player_id, vehicle_id, upgrade_type),
    FOREIGN KEY (player_id, vehicle_id) REFERENCES owned_vehicles(player_id, vehicle_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS career_progress (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'ROOKIE',
    completed_events TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    finish_time REAL NOT NULL CHECK (finish_time >= 0),
    position INTEGER NOT NULL CHECK (position >= 1),
    credits_awarded INTEGER NOT NULL CHECK (credits_awarded >= 0),
    reputation_awarded INTEGER NOT NULL CHECK (reputation_awarded >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_settings (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    settings_json TEXT NOT NULL DEFAULT '{}'
);
