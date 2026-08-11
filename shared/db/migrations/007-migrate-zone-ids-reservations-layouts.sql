-- Migration: 007-migrate-zone-ids-reservations-layouts
-- Canonical zone identity for reservations and canvas layouts.
-- configuracion.zonas_config remains the source of truth. The legacy display
-- columns/keys are intentionally retained for compatibility and diagnostics.
-- Unknown values are never guessed and remain nullable.

ALTER TABLE public.canvas_layouts
  ADD COLUMN IF NOT EXISTS zona_id text;

-- Resolve configured IDs and exact display names first, then historical aliases.
UPDATE public.reservas AS r
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text, nombre text)
WHERE r.zona_id IS NOT NULL
  AND (lower(trim(r.zona_id)) = lower(trim(z.id))
    OR lower(trim(r.zona_id)) = lower(trim(z.nombre)))
  AND z.id IS NOT NULL;

UPDATE public.reservas AS r
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text)
WHERE r.zona_id IS NOT NULL
  AND ((lower(trim(r.zona_id)) = 'privado' AND lower(trim(z.id)) = 'reservado')
    OR lower(trim(r.zona_id)) = lower(trim(z.id)))
  AND z.id IS NOT NULL;

UPDATE public.canvas_layouts AS l
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text, nombre text)
WHERE l.zona_id IS NULL
  AND l.zona IS NOT NULL
  AND (lower(trim(l.zona)) = lower(trim(z.id))
    OR lower(trim(l.zona)) = lower(trim(z.nombre)))
  AND z.id IS NOT NULL;

UPDATE public.canvas_layouts AS l
SET zona_id = z.id
FROM public.configuracion AS c
CROSS JOIN LATERAL jsonb_to_recordset(
  CASE WHEN jsonb_typeof(c.zonas_config) = 'array' THEN c.zonas_config ELSE '[]'::jsonb END
) AS z(id text)
WHERE l.zona_id IS NULL
  AND l.zona IS NOT NULL
  AND ((lower(trim(l.zona)) = 'privado' AND lower(trim(z.id)) = 'reservado')
    OR lower(trim(l.zona)) = lower(trim(z.id)))
  AND z.id IS NOT NULL;

-- Do not rewrite configuracion.diseno_original here. JSON keys may be mixed,
-- unknown, or flat legacy arrays; API compatibility reads them safely and
-- writes only the requested canonical key without deleting unknown keys.

ALTER TABLE public.canvas_layouts
  DROP CONSTRAINT IF EXISTS canvas_layouts_fecha_turno_zona_key;
DROP INDEX IF EXISTS public.canvas_layouts_fecha_turno_zona_key;
DROP INDEX IF EXISTS public.canvas_layouts_fecha_turno_zona_idx;

CREATE UNIQUE INDEX IF NOT EXISTS canvas_layouts_fecha_turno_zona_id_key
  ON public.canvas_layouts (fecha, turno, zona_id);

CREATE INDEX IF NOT EXISTS reservas_zona_id_idx ON public.reservas (zona_id);
CREATE INDEX IF NOT EXISTS canvas_layouts_zona_id_idx ON public.canvas_layouts (zona_id);
