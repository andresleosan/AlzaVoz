-- Columnas para Contacto en Condiciones Seguras (Tarea 11 / Idea I001)
ALTER TABLE confidential_reports ADD COLUMN safe_contact_json TEXT NOT NULL DEFAULT '{"preference":"no_contact"}';
