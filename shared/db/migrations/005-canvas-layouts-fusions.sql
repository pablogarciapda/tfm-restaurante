-- Migration: 005-canvas-layouts-fusions
-- Add fusions JSONB column to canvas_layouts for per-date+turn fusion persistence.
-- Fusions are saved/restored independently per date+turn+zona,
-- so lunch can have different table fusions than dinner on the same date.
-- Structure: [{ id_fusion, parent_id, capacity, mesa_ids }]

ALTER TABLE canvas_layouts ADD COLUMN IF NOT EXISTS fusions jsonb DEFAULT '[]'::jsonb;
