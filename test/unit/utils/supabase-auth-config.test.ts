import { describe, expect, it, vi } from 'vitest'
import {
  SupabaseAuthUrlSyncError,
  syncSupabaseAuthUrls,
} from '../../../server/utils/supabase-auth-config'

const credentials = {
  projectRef: 'project-ref',
  managementToken: 'management-token',
}

function response(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('syncSupabaseAuthUrls', () => {
  it('skips when management credentials are missing', async () => {
    const fetcher = vi.fn()

    await expect(syncSupabaseAuthUrls({ siteUrl: 'https://tenant.example', fetcher })).resolves.toEqual({ skipped: true })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('normalizes the configured URL before sending it', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(200, { uri_allow_list: '' }))
      .mockResolvedValueOnce(response(200))

    await syncSupabaseAuthUrls({ ...credentials, siteUrl: ' https://tenant.example/// ', fetcher })

    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
      site_url: 'https://tenant.example',
      uri_allow_list: 'https://tenant.example/recuperar-password',
    })
  })

  it('preserves existing allowlist entries and deduplicates equivalent entries', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(200, {
        uri_allow_list: 'https://existing.example/callback, https://tenant.example/recuperar-password/, https://existing.example/callback',
      }))
      .mockResolvedValueOnce(response(200))

    await syncSupabaseAuthUrls({ ...credentials, siteUrl: 'https://tenant.example/', fetcher })

    expect(JSON.parse(fetcher.mock.calls[1][1].body).uri_allow_list).toBe(
      'https://existing.example/callback,https://tenant.example/recuperar-password',
    )
  })

  it('rejects invalid site URLs without calling the API', async () => {
    const fetcher = vi.fn()

    await expect(syncSupabaseAuthUrls({ ...credentials, siteUrl: 'javascript:alert(1)', fetcher }))
      .rejects.toThrow('site_url debe ser una URL HTTP o HTTPS válida')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reports non-2xx failures without leaking the management token', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(200, { uri_allow_list: '' }))
      .mockResolvedValueOnce(response(403))

    const result = syncSupabaseAuthUrls({ ...credentials, siteUrl: 'https://tenant.example', fetcher })
    await expect(result).rejects.toBeInstanceOf(SupabaseAuthUrlSyncError)
    await expect(result).rejects.not.toThrow(credentials.managementToken)
  })
})
