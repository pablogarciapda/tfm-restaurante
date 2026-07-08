// Shared image security utilities for server-side Nitro endpoints.
// Used by /api/fetch-image (external URL proxy) and /api/images (Supabase storage proxy).

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'ico']
const ALLOWED_BUCKETS = ['plato-images', 'evento-images', 'config-images']

// Magic bytes signatures for image formats we allow
const IMAGE_MAGIC_BYTES: Array<{ label: string; bytes: number[]; offset: number }> = [
  { label: 'JPEG', bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  { label: 'PNG', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 },
  { label: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF87a or GIF89a
  { label: 'BMP', bytes: [0x42, 0x4D], offset: 0 },
  { label: 'WebP', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // RIFF....WEBP → 'WEBP' at offset 8
  { label: 'ICO', bytes: [0x00, 0x00, 0x01, 0x00], offset: 0 }, // ICO: reserved(0) + type(1=icon) + count
]

/**
 * Validate that a buffer has valid image magic bytes.
 * Blocks polyglot files, non-image data, and SVGs (no magic bytes match).
 */
export function hasValidMagicBytes(buffer: ArrayBuffer): { valid: boolean; format: string | null } {
  const view = new Uint8Array(buffer)
  if (view.length < 12) return { valid: false, format: null }

  for (const sig of IMAGE_MAGIC_BYTES) {
    if (view.length < sig.offset + sig.bytes.length) continue
    const match = sig.bytes.every((b, i) => view[sig.offset + i] === b)
    if (match) return { valid: true, format: sig.label }
  }

  return { valid: false, format: null }
}

/**
 * Validate that a bucket name is in the allowed list.
 */
export function isAllowedBucket(bucket: string): boolean {
  return ALLOWED_BUCKETS.includes(bucket)
}

/**
 * Validate an image file path for security:
 * - Blocks path traversal (../)
 * - Blocks empty paths
 * - Validates file extension
 */
export function validateImageFilePath(filePath: string): void {
  if (!filePath || filePath.includes('..')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Invalid path' })
  }

  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Invalid file type' })
  }
}

/**
 * Reconstruct a proxy URL from a Supabase public URL (backward compatibility).
 * Converts from Supabase public URL to our proxy URL.
 */
export function supabaseUrlToProxy(supabaseUrl: string): string | null {
  if (!supabaseUrl) return null

  // Match: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const match = supabaseUrl.match(/\/object\/public\/([^/]+)\/(.+)/)
  if (!match) return null

  const [, bucket, filePath] = match
  return `/api/images/${bucket}/${filePath}`
}
