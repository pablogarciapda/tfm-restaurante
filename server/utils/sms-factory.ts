/**
 * sms-factory.ts — SMS provider factory (SM-004)
 *
 * Single source of truth: labsMobileTest from runtimeConfig.
 * - labsMobileTest === '1' → MockSmsProvider (test mode, code "1234", zero API calls)
 * - labsMobileTest === '0' → LabsMobileProvider (real SMS via LabsMobile API)
 *
 * For unit tests, providerNameOverride bypasses testMode check.
 *
 * The SmsProvider contract (shared/contracts/sms.contract.ts) keeps the system
 * decoupled — adding a new provider means:
 *   1. Create a class that implements SmsProvider
 *   2. Register it here in the factory
 *   The rest of the app never changes.
 */

import type { SmsProvider } from '#shared/contracts/sms.contract'
import { MockSmsProvider } from '../sms/mock'
import { LabsMobileProvider, type LabsMobileConfig } from '../sms/labsmobile'

let _cachedProvider: SmsProvider | null = null

interface ResolvedConfig {
  testMode: string
  labsMobileConfig?: LabsMobileConfig
}

function resolveRuntimeConfig(): ResolvedConfig {
  // useRuntimeConfig() is auto-imported by Nitro for files in server/.
  // In unit tests (outside Nitro), it throws ReferenceError → catch → mock.
  try {
    const config = useRuntimeConfig()

    // Priority: 1) process.env (direct, always reliable at dev time)
    //           2) Nuxt runtimeConfig (may or may not merge the env var)
    //           3) '0' default
    // IMPORTANT: config.labsMobileTest defaults to '0' — which is truthy! —
    // so putting it before process.env would mask the env var override.
    const testMode =
      process.env.NUXT_LABS_MOBILE_TEST ||
      (config.labsMobileTest as string) ||
      '0'

    console.log('[SmsFactory] testMode resolved to:', testMode, '(env:', process.env.NUXT_LABS_MOBILE_TEST, 'config:', config.labsMobileTest, ')')

    const username = (config.labsMobileUsername as string) || ''
    const token = (config.labsMobileToken as string) || ''

    const labsMobileConfig: LabsMobileConfig | undefined =
      username && token
        ? {
            username,
            token,
            sender: (config.labsMobileSender as string) || '',
          }
        : undefined

    return { testMode, labsMobileConfig }
  } catch {
    // Outside Nitro (unit test environments) — default to mock
    console.log('[SmsFactory] useRuntimeConfig() not available, defaulting to mock')
    return { testMode: '1' }
  }
}

/**
 * Get the SMS provider.
 *
 * @param providerNameOverride - For unit tests: 'mock' forces mock, 'labsmobile' forces real
 * @param configOverride - For unit tests: inject credentials without runtimeConfig
 */
export function getSmsProvider(
  providerNameOverride?: string,
  configOverride?: LabsMobileConfig,
): SmsProvider {
  if (_cachedProvider) return _cachedProvider

  const { testMode, labsMobileConfig } = resolveRuntimeConfig()

  // providerNameOverride is for unit tests — it bypasses the testMode check
  const effectiveName = providerNameOverride ?? (testMode === '1' ? 'mock' : 'labsmobile')

  if (effectiveName === 'labsmobile') {
    const mergedConfig = configOverride ?? labsMobileConfig

    if (!mergedConfig?.username || !mergedConfig?.token) {
      console.warn(
        '[SmsFactory] LabsMobile selected but credentials missing ' +
          '(username=%s, token=%s). Falling back to mock.',
        mergedConfig?.username ? '✓' : '✗',
        mergedConfig?.token ? '✓' : '✗',
      )
      _cachedProvider = new MockSmsProvider()
      return _cachedProvider
    }

    _cachedProvider = new LabsMobileProvider({
      username: mergedConfig.username,
      token: mergedConfig.token,
      sender: mergedConfig.sender || '',
    })
    return _cachedProvider
  }

  // 'mock' or unknown → MockSmsProvider (unit tests, test mode, or fallback)
  _cachedProvider = new MockSmsProvider()
  return _cachedProvider
}

/** Reset the cached provider (useful for testing / per-request freshness) */
export function resetSmsProvider(): void {
  _cachedProvider = null
}
