import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  if (!body?.fecha || !body?.turno || !Array.isArray(body.positions)) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere fecha, turno y positions[]' })
  }

  const turno = body.turno as string
  if (turno !== 'comida' && turno !== 'cena') {
    throw createError({ statusCode: 400, statusMessage: 'Turno debe ser "comida" o "cena"' })
  }

  const { error } = await supabase
    .from('canvas_layouts')
    .upsert({
      fecha: body.fecha, turno, zona: body.zona || '', positions: body.positions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fecha, turno, zona' })

  if (error) throw createError({ statusCode: 500, statusMessage: `Error al guardar: ${error.message}` })

  return { success: true, fecha: body.fecha, turno, count: body.positions.length }
})
