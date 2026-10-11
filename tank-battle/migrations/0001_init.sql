-- ============================================================
-- 坦克大战 · 数据库初始化脚本
-- 数据库：Cloudflare D1 (SQLite)
-- 使用方法：
--   1. Cloudflare Dashboard → Storage & Databases → D1 → 选择数据库
--   2. 进入 Console 标签
--   3. 粘贴本文件全部内容 → Execute
-- ============================================================

-- ------------------------------------------------------------
-- 表 1：users —— 用户账户
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  salt           TEXT    NOT NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login     TEXT
);

-- 用户名索引（登录、查重高频使用）
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);


-- ------------------------------------------------------------
-- 表 2：user_saves —— 用户云存档
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_saves (
  user_id          INTEGER PRIMARY KEY,
  unlocked_tanks   TEXT    NOT NULL DEFAULT 'basic,armored_car',
  total_wins       INTEGER NOT NULL DEFAULT 0,
  total_losses     INTEGER NOT NULL DEFAULT 0,
  total_games      INTEGER NOT NULL DEFAULT 0,
  total_damage     REAL    NOT NULL DEFAULT 0,
  best_turn_count  INTEGER NOT NULL DEFAULT 999,
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 排行榜索引（按胜场 / 伤害 / 场次排序）
CREATE INDEX IF NOT EXISTS idx_saves_wins   ON user_saves(total_wins DESC);
CREATE INDEX IF NOT EXISTS idx_saves_damage ON user_saves(total_damage DESC);
CREATE INDEX IF NOT EXISTS idx_saves_games  ON user_saves(total_games DESC);


-- ------------------------------------------------------------
-- 表 3：match_records —— 对局记录（每局一条）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  result        TEXT    NOT NULL,          -- 'win' | 'loss'
  mode          TEXT    NOT NULL,          -- 'pve' | 'pvp' | 'campaign' | 'online'
  tank_used     TEXT,
  damage_dealt  REAL    NOT NULL DEFAULT 0,
  turn_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户对局历史索引
CREATE INDEX IF NOT EXISTS idx_match_user    ON match_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_created ON match_records(created_at DESC);


-- ------------------------------------------------------------
-- 表 4：sessions —— 会话 Token
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Token 索引与用户索引
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);


-- ============================================================
-- 说明
-- ============================================================
-- 1. SQLite 默认不开启外键约束，这里显式声明的 FOREIGN KEY 用于
--    文档语义；实际删除关联数据时由各 API 手动 DELETE 清理。
--
-- 2. 所有时间字段均为 ISO 字符串（UTC），由 datetime('now') 生成。
--
-- 3. 若要启用战役进度字段（可选），请另外执行 migrations/0002_campaign.sql：
--      ALTER TABLE user_saves ADD COLUMN campaign_progress TEXT DEFAULT '';
--
-- 4. 初始解锁坦克与前端 index.html 中的 INITIAL_TANKS 保持一致：
--      ['basic', 'armored_car']
-- ============================================================