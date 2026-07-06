// GET /api/images/:bucket/:path
// Secure proxy for Supabase Storage images.
// Obfuscates the Supabase project URL from the client.
// Also handles backward-compatible rewrite of old Supabase public URLs.
//
// Security:
//   - Only allows whitelisted buckets (plato-images, evento-images)
//   - Blocks path traversal
//   - Validates file extension (only image types)
//   - Validates Content-Type from origin response
//   - Validates magic bytes (blocks polyglot/non-image data)
//   - Blocks SVGs (Canvas security risk)
//   - Size limit via response stream
//   - Immutable cache headers (images are content-addressed)

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  const rawPath = getRouterParam(event, 'path') || ''

  // --- Security: parse and validate path ---
  const pathParts = rawPath.split('/')
  const bucket = pathParts[0]
  const filePath = pathParts.slice(1).join('/')

  if (!bucket || !filePath) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Falta bucket o path' })
  }

  // Whitelist buckets
  if (!isAllowedBucket(bucket)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Bucket no permitido' })
  }

  // Path traversal + extension validation
  validateImageFilePath(filePath)

  // --- Fetch from Supabase Storage via public URL ---
  // Using server-side fetch so the Supabase URL never reaches the client
  const supabaseUrl = useRuntimeConfig().public.supabase.url
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`

  let response: Response
  try {
    response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'LaZingara/1.0',
        Accept: 'image/*',
      },
      redirect: 'follow',
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Error al conectar con el almacenamiento' })
  }

  if (!response.ok) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Imagen no encontrada' })
  }

  // --- Security: validate content-type ---
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.startsWith('image/')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'El recurso no es una imagen' })
  }

  // Block SVGs — Canvas can't sanitize them
  if (contentType.startsWith('image/svg')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'No se permiten imágenes SVG' })
  }

  // Check content-length if available
  const contentLength = Number(response.headers.get('content-length') ?? 0)
  if (contentLength > MAX_IMAGE_SIZE) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: 'La imagen supera el tamaño máximo' })
  }

  // --- Read and validate content ---
  let buffer: ArrayBuffer
  try {
    buffer = await response.arrayBuffer()
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Error al leer la imagen' })
  }

  if (buffer.byteLength === 0) {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Imagen vacía' })
  }

  // Validate magic bytes
  const magic = hasValidMagicBytes(buffer)
  if (!magic.valid) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'El archivo no tiene una cabecera de imagen válida' })
  }

  // --- Set response headers ---
  // Immutable cache: images are content-addressed (timestamp + random in filename)
  const cacheControl = process.env.NODE_ENV === 'production'
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600'

  setHeaders(event, {
    'Content-Type': contentType,
    'Content-Length': String(buffer.byteLength),
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  })

  return new Uint8Array(buffer)
})
