/**
 * server/utils/rate-limit.ts — Simple in-memory rate limiter
 *
 * Uses per-key token buckets. Designed for SMS endpoints to prevent abuse.
 * Auto-imported in Nuxt server context.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

const DEFAULT_WINDOW_MS = 60_000 // 1 minute
const DEFAULT_MAX_REQUESTS = 5

/**
 * Returns true if the request should be allowed, false if rate-limited.
 * Cleans up expired entries on each call.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  const now = Date.now()

  // Clean expired entries periodically
  if (buckets.size > 1000) {
    for (const [k, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(k)
    }
  }

  const entry = buckets.get(key)

  if (!entry || now >= entry.resetAt) {
    // Fresh window
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}
