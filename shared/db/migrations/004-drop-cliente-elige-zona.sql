-- Migration: 004-drop-cliente-elige-zona
-- Removes the `cliente_elige_zona` toggle from configuracion.
-- The feature was removed in PR #68 — zone selection by customers was deemed inviable.

ALTER TABLE configuracion DROP COLUMN IF EXISTS cliente_elige_zona;
