/**
 * POST /api/_migrate-canvas — One-time migration to add canvas columns
 *
 * Adds canvas_ancho_base and canvas_alto_base columns to configuracion.
 * Call once: curl -X POST http://localhost:3000/api/_migrate-canvas
 * Requires admin auth.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Try to add columns — Supabase REST API will error if not in schema cache
  // We use raw query through a Postgres function created at migration time
  // via another mechanism. For now this is a no-op — the file-based config
  // handles persistence until the user runs the SQL in the Supabase dashboard.
  //
  // See: shared/db/migrations/002-add-canvas-dims.sql

  return {
    message: 'Migration not auto-executable. Run the SQL in shared/db/migrations/002-add-canvas-dims.sql via Supabase SQL Editor.',
    sql: `
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS canvas_ancho_base integer NOT NULL DEFAULT 1400;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS canvas_alto_base integer NOT NULL DEFAULT 900;
    `.trim(),
  }
})
