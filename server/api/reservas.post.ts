// POST /api/reservas — Mock reservation endpoint (RF-005)
// Body: { nombre, telefono, email, fecha_hora, numero_comensales }
// Returns 200 { success: true, id: "mock-<timestamp>" } on valid.
// Returns 400 with Spanish error on invalid body.

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Faltan datos de la reserva',
    })
  }

  const { nombre, telefono, email, fecha_hora, numero_comensales } = body

  // Validate required fields
  const missing: string[] = []
  if (!nombre) missing.push('nombre')
  if (!telefono) missing.push('telefono')
  if (!email) missing.push('email')
  if (!fecha_hora) missing.push('fecha_hora')
  if (numero_comensales === undefined || numero_comensales === null)
    missing.push('numero_comensales')

  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Faltan campos obligatorios: ${missing.join(', ')}`,
    })
  }

  // Validate comensales range (1-20)
  const comensales = parseInt(numero_comensales, 10)
  if (isNaN(comensales) || comensales < 1 || comensales > 20) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'El número de comensales debe estar entre 1 y 20',
    })
  }

  // Validate fecha_hora is future
  const fecha = new Date(fecha_hora)
  if (isNaN(fecha.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'La fecha no es válida',
    })
  }
  if (fecha <= new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'La fecha debe ser futura',
    })
  }

  // Mock: always succeed
  return {
    success: true,
    id: `mock-${Date.now()}`,
  }
})
