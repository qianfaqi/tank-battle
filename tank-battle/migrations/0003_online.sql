-- 联机房间表
CREATE TABLE IF NOT EXISTS online_rooms (
  id             TEXT PRIMARY KEY,               -- 6 位房间号
  host_id        INTEGER NOT NULL,
  host_name      TEXT NOT NULL,
  guest_id       INTEGER,
  guest_name     TEXT,
  host_tank      TEXT,
  guest_tank     TEXT,
  map_id         TEXT DEFAULT 'position_zero',
  host_base      TEXT,
  guest_base     TEXT,
  status         TEXT NOT NULL DEFAULT 'selecting',  -- selecting | playing | ended
  current_team   TEXT NOT NULL DEFAULT 'red',
  state_json     TEXT,
  move_count     INTEGER NOT NULL DEFAULT 0,
  winner_team    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON online_rooms(status, updated_at DESC);