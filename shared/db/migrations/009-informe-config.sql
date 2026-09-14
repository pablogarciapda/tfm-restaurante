-- Print report template configuration (font, size, column toggles).
-- Consumed by the reservas print document and the ConfiguracionForm report
-- section with live preview.

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS informe_config JSONB NOT NULL DEFAULT '{}'::jsonb;
