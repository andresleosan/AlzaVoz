CREATE TABLE IF NOT EXISTS community_observations (
  request_id TEXT PRIMARY KEY,
  commune INTEGER NOT NULL,
  category TEXT NOT NULL,
  day TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_day_zone ON community_observations(day, commune, category);
