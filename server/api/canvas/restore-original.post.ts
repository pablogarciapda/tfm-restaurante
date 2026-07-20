/**
 * POST /api/canvas/restore-original
 *
 * Restores all mesas to the "original design" stored in
 * configuracion.diseno_original. Updates mesas.posicion_x,
 * mesas.posicion_y, and mesas.rotacion from the snapshot.
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

  // Read original design from configuracion
  const { data: config, error: configError } = await client
    .from('configuracion')
    .select('diseno_original')
    .limit(1)
    .single()

  if (configError || !config?.diseno_original) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No hay diseño original guardado. Guarde primero desde /cocina/diseno.',
    })
  }

  const positions = config.diseno_original as Array<{
    mesa_id: string
    posicion_x: number
    posicion_y: number
    rotacion: number
  }>

  if (!Array.isArray(positions) || positions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Diseño original vacío o inválido' })
  }

  // Update each mesa in the DB
  let ok = 0
  for (const pos of positions) {
    const { error } = await client
      .from('mesas')
      .update({
        posicion_x: pos.posicion_x,
        posicion_y: pos.posicion_y,
        rotacion: pos.rotacion,
      })
      .eq('id', pos.mesa_id)

    if (!error) ok++
  }

  return { success: true, restored: ok, total: positions.length }
})
