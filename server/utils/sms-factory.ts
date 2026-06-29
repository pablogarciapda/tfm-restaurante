/**
 * sms-factory.ts — SMS provider factory (SM-004)
 *
 * Accepts a provider identifier and optional LabsMobile config.
 * Returns the appropriate SmsProvider implementation.
 *
 * Call from Nitro endpoints: getSmsProvider(useRuntimeConfig().smsProvider, { ... })
 * Test without Nuxt: getSmsProvider('mock') or getSmsProvider('labsmobile', { ... })
 */

import type { SmsProvider } from '../../shared/contracts/sms.contract'
import { MockSmsProvider } from '../sms/mock'
import { LabsMobileProvider, type LabsMobileConfig } from '../sms/labsmobile'

let _cachedProvider: SmsProvider | null = null

export function getSmsProvider(
  providerName?: string,
  config?: LabsMobileConfig,
): SmsProvider {
  // Cache: return existing provider if already created
  if (_cachedProvider) return _cachedProvider

  const name = providerName || 'mock'

  if (name === 'labsmobile') {
    _cachedProvider = new LabsMobileProvider({
      username: config?.username || '',
      token: config?.token || '',
      sender: config?.sender || 'LaZingara',
      testMode: config?.testMode || '1',
    })
    return _cachedProvider
  }

  if (name !== 'mock') {
    console.warn(`Unknown SMS_PROVIDER: "${name}", falling back to mock`)
  }

  _cachedProvider = new MockSmsProvider()
  return _cachedProvider
}

/** Reset the cached provider (useful for testing) */
export function resetSmsProvider(): void {
  _cachedProvider = null
}
