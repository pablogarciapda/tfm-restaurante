/**
 * Transform an image URL to use our proxy endpoint.
 * Handles backward compatibility with old Supabase public URLs stored in DB.
 *
 * - If the URL is already a proxy URL (/api/images/...), returns as-is
 * - If the URL is a Supabase public URL, rewrites to proxy URL
 * - Otherwise, returns the URL as-is (external URLs)
 *
 * Security: our proxy endpoint validates buckets, path traversal, extensions,
 * content-type, and magic bytes before serving.
 */

const SUPABASE_STORAGE_PATTERN = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)/

export function toProxyUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  // Already a proxy URL
  if (url.startsWith('/api/images/')) return url

  // Supabase public URL → rewrite to proxy
  const match = url.match(SUPABASE_STORAGE_PATTERN)
  if (match) {
    const [, bucket, filePath] = match
    return `/api/images/${bucket}/${filePath}`
  }

  // External URL or other → leave as-is
  return url
}
