import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const query = getQuery(event)
  const fecha = query.fecha as string
  const turno = query.turno as string
  const zona = (query.zona as string) || ''
  if (!fecha || !turno) throw createError({ statusCode: 400, statusMessage: 'Se requiere fecha y turno' })
  if (turno !== 'comida' && turno !== 'cena') throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('canvas_layouts').select('*').eq('fecha', fecha).eq('turno', turno).eq('zona', zona).maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al cargar: ${error.message}` })
  if (!data) throw createError({ statusCode: 404, statusMessage: `No hay layout para ${fecha} (${turno}) en ${zona || 'todas las zonas'}` })

  return { fecha: data.fecha, turno: data.turno, zona: data.zona, positions: data.positions, updated_at: data.updated_at }
})
