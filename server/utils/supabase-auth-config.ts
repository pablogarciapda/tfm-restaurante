type AuthConfigFetcher = (url: string, options: {
  method: string
  headers: Record<string, string>
  body?: string
}) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export type SupabaseAuthUrlSyncOptions = {
  projectRef?: string
  managementToken?: string
  siteUrl: unknown
  fetcher?: AuthConfigFetcher
}

export class SupabaseAuthUrlSyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseAuthUrlSyncError'
  }
}

function normalizeSiteUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SupabaseAuthUrlSyncError('site_url debe ser una URL HTTP o HTTPS válida')
  }

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new SupabaseAuthUrlSyncError('site_url debe ser una URL HTTP o HTTPS válida')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SupabaseAuthUrlSyncError('site_url debe ser una URL HTTP o HTTPS válida')
  }

  return parsed.toString().replace(/\/+$/, '')
}

function normalizeAllowlistEntry(entry: string): string {
  return entry.trim().replace(/\/+$/, '')
}

function mergeAllowlist(existing: unknown, recoveryUrl: string): string {
  const entries = Array.isArray(existing)
    ? existing.filter((entry): entry is string => typeof entry === 'string')
    : typeof existing === 'string'
      ? existing.split(',')
      : []
  const seen = new Set<string>()
  const merged: string[] = []

  for (const entry of [...entries, recoveryUrl]) {
    const normalized = normalizeAllowlistEntry(entry)
    const key = normalized.toLowerCase()
    if (normalized && !seen.has(key)) {
      seen.add(key)
      merged.push(normalized)
    }
  }

  return merged.join(',')
}

export async function syncSupabaseAuthUrls({
  projectRef,
  managementToken,
  siteUrl,
  fetcher = globalThis.fetch,
}: SupabaseAuthUrlSyncOptions): Promise<{ skipped: boolean }> {
  if (!projectRef || !managementToken) {
    return { skipped: true }
  }

  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  const recoveryUrl = `${normalizedSiteUrl}/recuperar-password`
  const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`
  const headers = {
    Authorization: `Bearer ${managementToken}`,
    Accept: 'application/json',
  }

  let currentConfig: unknown
  try {
    const response = await fetcher(endpoint, { method: 'GET', headers })
    if (!response.ok) {
      throw new SupabaseAuthUrlSyncError(`Supabase Auth respondió con HTTP ${response.status}`)
    }
    currentConfig = await response.json()

    const currentAllowlist =
      currentConfig && typeof currentConfig === 'object' && 'uri_allow_list' in currentConfig
        ? (currentConfig as { uri_allow_list?: unknown }).uri_allow_list
        : undefined

    const patchResponse = await fetcher(endpoint, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_url: normalizedSiteUrl,
        uri_allow_list: mergeAllowlist(currentAllowlist, recoveryUrl),
      }),
    })

    if (!patchResponse.ok) {
      throw new SupabaseAuthUrlSyncError(`Supabase Auth respondió con HTTP ${patchResponse.status}`)
    }
  } catch (error) {
    if (error instanceof SupabaseAuthUrlSyncError) {
      throw error
    }
    throw new SupabaseAuthUrlSyncError('No se pudo contactar con Supabase Auth')
  }

  return { skipped: false }
}
