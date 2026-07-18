-- =============================================================================
-- Migration 002: Add canvas design dimensions to configuracion
--
-- Adds canvas_ancho_base and canvas_alto_base columns so the canvas
-- reference dimensions persist in the DB (survives deployments).
--
-- Run this in the Supabase SQL Editor.
-- =============================================================================

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS canvas_ancho_base integer NOT NULL DEFAULT 1400;

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS canvas_alto_base integer NOT NULL DEFAULT 900;

COMMENT ON COLUMN configuracion.canvas_ancho_base IS 'Canvas reference width in pixels for zone scaling (800-4000)';
COMMENT ON COLUMN configuracion.canvas_alto_base IS 'Canvas reference height in pixels for zone scaling (600-3000)';
