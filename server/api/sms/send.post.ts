// POST /api/sms/send — Send verification code (SM-005)
// Body: { phone: "+34600000000" }
// Returns 200 { success: true } on valid E.164 phone, 400 otherwise.
// Rate-limited: 1 SMS per phone per 60s, 5 per IP per 60s.

import { getSmsProvider, resetSmsProvider } from '../../utils/sms-factory'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.phone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Phone is required',
    })
  }

  // Validate E.164 format: +[1-9] followed by 1-14 digits
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  if (!phoneRegex.test(body.phone)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Phone must be E.164 format (+34...)',
    })
  }

  // Rate limit: 1 per phone number
  if (!checkRateLimit(`sms:phone:${body.phone}`, 1, 60_000)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Demasiados intentos. Espera un minuto antes de solicitar otro código.',
    })
  }

  // Rate limit: 5 per IP
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || event.node.req.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(`sms:ip:${ip}`, 5, 60_000)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Demasiadas solicitudes desde esta IP. Espera un minuto.',
    })
  }

  // Reset cached provider to pick up fresh runtime config per request
  resetSmsProvider()

  const provider = getSmsProvider()

  const result = await provider.sendVerificationCode(body.phone)

  if (!result.success) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SMS Error',
      message: result.error || 'Failed to send verification code',
    })
  }

  return { success: true }
})
