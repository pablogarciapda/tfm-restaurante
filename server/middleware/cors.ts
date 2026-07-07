// CORS middleware — whitelist-based origin allowlist
//
// Reads allowed origins from runtimeConfig.corsAllowedOrigins (comma-separated).
// Set via env var: NUXT_CORS_ALLOWED_ORIGINS=http://57.131.33.90:3000,https://www.lazingara.es
//
// - On matching Origin → adds Access-Control-Allow-Origin + standard CORS headers
// - On OPTIONS (preflight) → responds 204 No Content
// - On non-matching Origin → passes through untouched (same-origin behavior)

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  const config = useRuntimeConfig(event)
  const allowedOrigins = (config.corsAllowedOrigins || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  // Only add CORS headers if the request's Origin is explicitly allowed
  if (origin && allowedOrigins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-requested-with')
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setHeader(event, 'Access-Control-Max-Age', 86400)
  }

  // Handle preflight requests — respond 204 and stop processing
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }
})
