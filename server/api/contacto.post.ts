// POST /api/contacto — Contact form endpoint (CO-004)
// Receives { nombre, email, mensaje }, sanitizes inputs,
// returns 200 { success: true } on valid, 400 on invalid body.
// SQL injection-safe: no raw SQL queries. All input coerced to string, trimmed, length-capped,
// and stripped of control characters. Defense in depth.

interface ContactInput {
  nombre: string
  email: string
  mensaje: string
}

function sanitizeSingleLine(input: string): string {
  // For nombre/email: strip ALL control chars (no newlines/tabs allowed).
  // Prevents log forging and future SMTP header injection (CRLF in email/name).
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, '')
}

function sanitizeMultiLine(input: string): string {
  // For mensaje: strip control chars except \n and \t (legitimate multiline),
  // but strip \r (CRLF injection vector for future SMTP forwarding).
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r/g, '')
}

function validate(input: unknown): ContactInput | null {
  if (!input || typeof input !== 'object') return null

  const obj = input as Record<string, unknown>

  const nombre = typeof obj.nombre === 'string' ? obj.nombre.trim() : ''
  const email = typeof obj.email === 'string' ? obj.email.trim() : ''
  const mensaje = typeof obj.mensaje === 'string' ? obj.mensaje.trim() : ''

  if (!nombre || nombre.length > 100) return null
  if (!email || email.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (!mensaje || mensaje.length > 500) return null

  return { nombre, email, mensaje }
}

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = validate(raw)

  if (!parsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Faltan campos obligatorios o son inválidos: nombre, email, mensaje',
    })
  }

  // Sanitize: strip control characters (defense in depth after validation).
  // nombre/email are single-line (no newlines — prevents log forging + SMTP header
  // injection); mensaje keeps \n and \t for legitimate multiline content.
  const clean = {
    nombre: sanitizeSingleLine(parsed.nombre),
    email: sanitizeSingleLine(parsed.email),
    mensaje: sanitizeMultiLine(parsed.mensaje),
  }

  // Mock: always succeed (replace with email send / DB storage when implemented).
  // Do NOT log `clean` — it contains user PII (nombre, email, mensaje) which must
  // not reach server logs (GDPR/retention). Log a redacted, non-PII summary only.
  console.log('[contacto] form submission received', { mensajeLength: clean.mensaje.length })

  return { success: true }
})
