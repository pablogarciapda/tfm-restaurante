// POST /api/contacto — Mock contact form endpoint (CO-004)
// Receives { nombre, email, mensaje }, returns 200 { success: true } on valid,
// 400 { error: "..." } on invalid body.

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.nombre || !body.email || !body.mensaje) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Faltan campos obligatorios: nombre, email, mensaje',
    })
  }

  // Mock: always succeed
  return {
    success: true,
  }
})
