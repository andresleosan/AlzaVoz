CREATE TABLE IF NOT EXISTS search_notices (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  commune INTEGER NOT NULL, event_date TEXT NOT NULL, contact TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS search_kind_created ON search_notices(kind, created_at DESC);
CREATE TABLE IF NOT EXISTS search_tips (
  request_id TEXT PRIMARY KEY, notice_id TEXT NOT NULL REFERENCES search_notices(id),
  payload TEXT NOT NULL, text TEXT NOT NULL, contact TEXT NOT NULL, created_at TEXT NOT NULL
);
