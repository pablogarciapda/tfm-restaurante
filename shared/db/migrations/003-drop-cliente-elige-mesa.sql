-- Migration: 003-drop-cliente-elige-mesa
-- Removes the dead `cliente_elige_mesa` toggle from configuracion.
-- The feature was never wired up — no runtime code reads this field.

ALTER TABLE configuracion DROP COLUMN IF EXISTS cliente_elige_mesa;
