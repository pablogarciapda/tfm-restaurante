-- Migration: 006-add-mesas-zona-id
-- Durable zone identity for mesas. configuracion.zonas_config remains the
-- source of truth; zona and zona_nombre remain display-name compatibility fields.
-- Reservation and canvas-layout zone columns are intentionally out of scope;
-- migrate those consumers in a follow-up after this compatibility slice.

ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS zona_id text;

-- Match legacy display names without replacing an already established ID.
UPDATE public.mesas AS m
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text, nombre text)
WHERE m.zona_id IS NULL
  AND z.id IS NOT NULL
  AND z.nombre IS NOT NULL
  AND lower(trim(m.zona)) = lower(trim(z.nombre));

-- Explicit historical aliases. Only apply them when the configured durable ID
-- exists; unresolved legacy rows intentionally remain nullable.
UPDATE public.mesas AS m
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text)
WHERE m.zona_id IS NULL
  AND ((lower(trim(m.zona)) = 'zingaro' AND lower(z.id) = 'zingaro')
    OR (lower(trim(m.zona)) = 'privado' AND lower(z.id) = 'reservado'));

-- Some old rows cannot be mapped safely because their display name no longer
-- exists in configuracion.zonas_config. They remain zona_id = NULL by design.

ALTER TABLE public.mesas
  DROP CONSTRAINT IF EXISTS mesas_zona_check;

CREATE INDEX IF NOT EXISTS mesas_zona_id_idx ON public.mesas (zona_id);
