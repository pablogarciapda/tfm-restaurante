/**
 * POST /api/canvas/save-layout
 *
 * Saves current mesa positions for a specific date + turno into
 * the canvas_layouts table. Allows different layouts for different
 * days/shifts while the original design is preserved separately.
 *
 * Body: { fecha: 'YYYY-MM-DD', turno: 'comida'|'cena', zona: string, positions: [...] }
 *
 * Admin-only.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }

  const client = useSupabaseClient()

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Solo administradores' })
  }

  const body = await readBody(event)
  if (!body?.fecha || !body?.turno || !Array.isArray(body.positions)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Se requiere fecha, turno y positions[]',
    })
  }

  const turno = body.turno as string
  if (turno !== 'comida' && turno !== 'cena') {
    throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })
  }

  const { error } = await client
    .from('canvas_layouts')
    .upsert({
      fecha: body.fecha,
      turno,
      zona: body.zona || '',
      positions: body.positions,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'fecha, turno, zona',
    })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })
  }

  return { success: true, fecha: body.fecha, turno, count: body.positions.length }
})
