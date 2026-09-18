-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  salt          TEXT    NOT NULL,
  created_at    TEXT    DEFAULT (datetime('now')),
  last_login    TEXT
);

-- 用户游戏存档表
CREATE TABLE IF NOT EXISTS user_saves (
  user_id         INTEGER PRIMARY KEY,
  unlocked_tanks  TEXT    DEFAULT 'basic',     -- 逗号分隔的坦克 ID 列表
  total_wins      INTEGER DEFAULT 0,
  total_losses    INTEGER DEFAULT 0,
  total_games     INTEGER DEFAULT 0,
  total_damage    REAL    DEFAULT 0,
  best_turn_count INTEGER DEFAULT 999,
  updated_at      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 对局记录表（用于排行榜）
CREATE TABLE IF NOT EXISTS match_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  result        TEXT    NOT NULL,               -- 'win' | 'loss'
  mode          TEXT    NOT NULL,               -- 'pve' | 'pvp'
  tank_used     TEXT,
  damage_dealt  REAL    DEFAULT 0,
  turn_count    INTEGER DEFAULT 0,
  created_at    TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引加速排行榜查询
CREATE INDEX IF NOT EXISTS idx_match_user ON match_records(user_id);
CREATE INDEX IF NOT EXISTS idx_match_result ON match_records(result);
CREATE INDEX IF NOT EXISTS idx_saves_wins ON user_saves(total_wins DESC);

-- 会话表（简单 token 机制）
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TEXT    NOT NULL,
  created_at TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);