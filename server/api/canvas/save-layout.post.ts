import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { resolveZone } from '#shared/utils/zone-resolver'
import { isCanvasDate, isCanvasTurno } from '#shared/utils/canvas-layout'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  if (!body?.fecha || !body?.turno || !Array.isArray(body.positions)) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere fecha, turno y positions[]' })
  }
  if (!isCanvasDate(body.fecha)) throw createError({ statusCode: 400, statusMessage: 'Fecha debe tener formato YYYY-MM-DD' })

  const turno = body.turno as string
  if (!isCanvasTurno(turno)) {
    throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })
  }

  const fusions = Array.isArray(body.fusions) ? body.fusions : []
  const { data: config } = await supabase.from('configuracion').select('zonas_config').limit(1).single()
  const zone = resolveZone(body.zona_id ?? body.zona, (config?.zonas_config as any[]) ?? [])
  if (!zone) throw createError({ statusCode: 400, statusMessage: 'Zona no válida o no habilitada' })

  const { error } = await supabase
    .from('canvas_layouts')
    .upsert({
       fecha: body.fecha, turno, zona_id: zone.id, zona: zone.nombre, positions: body.positions, fusions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fecha,turno,zona_id' })

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })

  return { success: true, fecha: body.fecha, turno, zona_id: zone.id, zona: zone.nombre, count: body.positions.length, fusions_count: fusions.length }
})
