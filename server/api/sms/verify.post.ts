// POST /api/sms/verify — Verify a code (SM-005)
// Body: { phone: "+34600000000", code: "1234" }
// Returns 200 { valid: true/false }.

import { getSmsProvider, resetSmsProvider } from '../../utils/sms-factory'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.phone || !body.code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Phone and code are required',
    })
  }

  resetSmsProvider()
  const provider = getSmsProvider()

  const result = await provider.verifyCode(body.phone, body.code)

  return { valid: result.valid }
})
