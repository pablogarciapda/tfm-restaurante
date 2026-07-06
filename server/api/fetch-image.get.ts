// GET /api/fetch-image?url=...
// Proxy to download external images (avoids CORS restrictions in the browser).
// Security: blocks SVGs, validates magic bytes, limits size.
// Used by PlatoForm auto-download of external image URLs to Supabase Storage.
// The client-side Canvas re-encode (compressToWebP) is the final sanitizer:
//   - Strips ALL metadata (EXIF, XMP, comments)
//   - Drops non-image payloads (polyglot embedding)
//   - Fails on SVGs (can't draw SVG to Canvas for security reasons)
//   - Normalizes to clean WebP output

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// Magic bytes signatures for image formats we allow
const IMAGE_MAGIC_BYTES: Array<{ label: string; bytes: number[]; offset: number }> = [
  { label: 'JPEG', bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  { label: 'PNG', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 },
  { label: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF87a or GIF89a
  { label: 'BMP', bytes: [0x42, 0x4D], offset: 0 },
  { label: 'WebP', bytes: [0x49, 0x46], offset: 8 }, // RIFF....WEBP → 'IF' at offset 8
]

function hasValidMagicBytes(buffer: ArrayBuffer): { valid: boolean; format: string | null } {
  const view = new Uint8Array(buffer)
  if (view.length < 12) return { valid: false, format: null }

  for (const sig of IMAGE_MAGIC_BYTES) {
    if (view.length < sig.offset + sig.bytes.length) continue
    const match = sig.bytes.every((b, i) => view[sig.offset + i] === b)
    if (match) return { valid: true, format: sig.label }
  }

  return { valid: false, format: null }
}

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)

  if (!url || typeof url !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Falta el parámetro url',
    })
  }

  // Basic URL validation
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'URL inválida',
    })
  }

  // Deny internal/private IPs (SSRF protection)
  const hostname = parsed.hostname
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('192.168.')
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'No se permiten descargas desde direcciones internas',
    })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LaZingara/1.0)',
        Accept: 'image/*',
      },
      // Follow redirects (max 5)
      redirect: 'follow',
    })

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: `El servidor remoto respondió con código ${response.status}`,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''

    // Block SVGs explicitly — Canvas can't sanitize them, and they carry script risk
    if (contentType.startsWith('image/svg')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No se permiten imágenes SVG por riesgo de seguridad. Usa JPEG, PNG, WebP o AVIF.',
      })
    }

    if (!contentType.startsWith('image/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `La URL no devuelve una imagen (Content-Type: ${contentType})`,
      })
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'La imagen supera los 10MB',
      })
    }

    const buffer = await response.arrayBuffer()

    // Empty image check
    if (buffer.byteLength === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'La URL devolvió una imagen vacía',
      })
    }

    // Magic byte validation — ensures the file is actually an image, not a polyglot
    const magic = hasValidMagicBytes(buffer)
    if (!magic.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'El archivo descargado no tiene una cabecera de imagen válida. Solo se permiten JPEG, PNG, WebP, GIF y BMP.',
      })
    }

    setHeaders(event, {
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    })

    return new Uint8Array(buffer)
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'No se pudo descargar la imagen desde la URL proporcionada',
    })
  }
})
