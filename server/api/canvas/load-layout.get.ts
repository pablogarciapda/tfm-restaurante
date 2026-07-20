/**
 * GET /api/canvas/load-layout?fecha=YYYY-MM-DD&turno=comida|cena
 *
 * Loads a date-specific canvas layout from canvas_layouts.
 * Returns the positions array if found, or 404 if no layout exists
 * for that date/turno.
 *
 * Admin-only.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }

  const query = getQuery(event)
  const fecha = query.fecha as string
  const turno = query.turno as string

  if (!fecha || !turno) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere fecha y turno' })
  }

  if (turno !== 'comida' && turno !== 'cena') {
    throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })
  }

  const client = useSupabaseClient()

  const { data, error } = await client
    .from('canvas_layouts')
    .select('*')
    .eq('fecha', fecha)
    .eq('turno', turno)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al cargar: ${error.message}` })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: `No hay layout guardado para ${fecha} (${turno})`,
    })
  }

  return {
    fecha: data.fecha,
    turno: data.turno,
    zona: data.zona,
    positions: data.positions,
    updated_at: data.updated_at,
  }
})
