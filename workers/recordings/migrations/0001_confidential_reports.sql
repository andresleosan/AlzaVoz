-- Esquema Cloudflare D1 para Denuncias Confidenciales (Tarea 6)
CREATE TABLE IF NOT EXISTS confidential_reports (
  code TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  access_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  commune TEXT NOT NULL,
  neighborhood_reference TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  incident_date TEXT NOT NULL DEFAULT '',
  recording_session_id TEXT,
  recording_clip_count INTEGER NOT NULL DEFAULT 0,
  expected_attachments INTEGER NOT NULL DEFAULT 0,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  privacy_ack INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'radicado',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_confidential_reports_created_at
  ON confidential_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confidential_reports_commune_category
  ON confidential_reports(commune, category, risk_level);

CREATE TABLE IF NOT EXISTS report_attachments (
  id TEXT PRIMARY KEY,
  report_code TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  sanitization_summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(report_code, slot_index),
  FOREIGN KEY (report_code) REFERENCES confidential_reports(code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_attachments_report_code
  ON report_attachments(report_code, slot_index);
