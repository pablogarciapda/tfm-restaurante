import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { resolveZone } from '#shared/utils/zone-resolver'
import { isCanvasDate, isCanvasTurno } from '#shared/utils/canvas-layout'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const query = getQuery(event)
  const fecha = query.fecha as string
  const turno = query.turno as string
  const zona = query.zona as string | undefined
  const zonaId = query.zona_id as string | undefined
  if (!fecha || !turno) throw createError({ statusCode: 400, statusMessage: 'Se requiere fecha y turno' })
  if (!isCanvasDate(fecha)) throw createError({ statusCode: 400, statusMessage: 'Fecha debe tener formato YYYY-MM-DD' })
  if (!isCanvasTurno(turno)) throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })

  const supabase = serverSupabaseServiceRole(event)
  const { data: config } = await supabase.from('configuracion').select('zonas_config').limit(1).single()
  const zone = resolveZone(zonaId ?? zona, (config?.zonas_config as any[]) ?? [], { requireEnabled: false })
  if (!zone) throw createError({ statusCode: 400, statusMessage: 'Zona no válida' })
  let { data, error } = await supabase
    .from('canvas_layouts').select('*').eq('fecha', fecha).eq('turno', turno).eq('zona_id', zone.id).maybeSingle()
  if (!data && !error) {
    const legacy = await supabase.from('canvas_layouts').select('*').eq('fecha', fecha).eq('turno', turno).eq('zona', zone.nombre).maybeSingle()
    data = legacy.data
    error = legacy.error
  }

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al cargar: ${error.message}` })
  if (!data) return { exists: false, fecha, turno, zona_id: zone.id, zona: zone.nombre, positions: [] }

  return { exists: true, fecha: data.fecha, turno: data.turno, zona_id: data.zona_id ?? zone.id, zona: data.zona ?? zone.nombre, positions: data.positions, fusions: data.fusions ?? [], updated_at: data.updated_at }
})
