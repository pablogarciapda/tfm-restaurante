/**
 * sms-factory.ts — SMS provider factory (SM-004)
 *
 * Reads useRuntimeConfig().smsProvider and returns the appropriate SmsProvider.
 * - 'mock' (default) → MockSmsProvider
 * - 'labsmobile' → LabsMobileProvider (with credentials from runtimeConfig)
 * - unknown/undefined → logs warning, falls back to mock
 *
 * Uses try/catch around the useRuntimeConfig import so unit tests (no Nuxt runtime)
 * gracefully fall back to mock without needing mock setup.
 */

import type { SmsProvider } from '#shared/contracts/sms.contract'
import { MockSmsProvider } from '../sms/mock'
import { LabsMobileProvider, type LabsMobileConfig } from '../sms/labsmobile'

let _cachedProvider: SmsProvider | null = null

function resolveRuntimeConfig(): { providerName: string; labsMobileConfig?: LabsMobileConfig } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nuxtApp = require('#imports') as { useRuntimeConfig: () => Record<string, unknown> }
    const config = nuxtApp.useRuntimeConfig()
    const providerName = (config.smsProvider as string) || 'mock'

    const labsMobileConfig: LabsMobileConfig | undefined = config.labsMobileUsername
      ? {
          username: (config.labsMobileUsername as string) || '',
          token: (config.labsMobileToken as string) || '',
          sender: (config.labsMobileSender as string) || 'LaZingara',
          testMode: (config.labsMobileTest as string) || '1',
        }
      : undefined

    return { providerName, labsMobileConfig }
  } catch {
    // Running outside Nuxt/Nitro (unit test environments) — default to mock
    return { providerName: 'mock' }
  }
}

export function getSmsProvider(
  providerNameOverride?: string,
  configOverride?: LabsMobileConfig,
): SmsProvider {
  if (_cachedProvider) return _cachedProvider

  // In Nuxt: read from useRuntimeConfig(). Outside Nuxt: use mock/defaults
  const { providerName, labsMobileConfig } = resolveRuntimeConfig()

  const name = providerNameOverride || providerName

  if (name === 'labsmobile') {
    const mergedConfig = configOverride || labsMobileConfig
    _cachedProvider = new LabsMobileProvider({
      username: mergedConfig?.username || '',
      token: mergedConfig?.token || '',
      sender: mergedConfig?.sender || 'LaZingara',
      testMode: mergedConfig?.testMode || '1',
    })
    return _cachedProvider
  }

  if (name !== 'mock') {
    console.warn(`Unknown SMS_PROVIDER: "${name}", falling back to mock`)
  }

  _cachedProvider = new MockSmsProvider()
  return _cachedProvider
}

/** Reset the cached provider (useful for testing / per-request freshness) */
export function resetSmsProvider(): void {
  _cachedProvider = null
}
