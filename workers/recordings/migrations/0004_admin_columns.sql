-- Columnas para Panel Privado de Gestión (Tarea 9)
ALTER TABLE confidential_reports ADD COLUMN admin_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE confidential_reports ADD COLUMN updated_at TEXT;
