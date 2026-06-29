/**
 * sms.test.ts — SmsProvider contract type tests (SM-001)
 *
 * Verifies the interface shape with a mock implementation:
 * - sendVerificationCode returns the expected shape
 * - verifyCode returns the expected shape
 * - types SmsSendRequest, SmsSendResponse, SmsVerifyRequest, SmsVerifyResponse exist
 */

import { describe, it, expect } from 'vitest'
import type {
  SmsProvider,
  SmsSendResponse,
  SmsVerifyResponse,
} from '../../../shared/contracts/sms.contract'

// Runtime mock to verify interface shape
class MockSms implements SmsProvider {
  async sendVerificationCode(_phone: string): Promise<SmsSendResponse> {
    return { success: true, code: '1234' }
  }

  async verifyCode(_phone: string, _code: string): Promise<SmsVerifyResponse> {
    return { valid: true }
  }
}

describe('SmsProvider contract (SM-001)', () => {
  it('implements sendVerificationCode returning { success, code? }', async () => {
    const provider = new MockSms()
    const result: SmsSendResponse = await provider.sendVerificationCode('+34600000000')

    expect(result).toHaveProperty('success')
    expect(result.success).toBe(true)
    expect(result).toHaveProperty('code')
    expect(result.code).toBe('1234')
  })

  it('implements verifyCode returning { valid, error? }', async () => {
    const provider = new MockSms()
    const result: SmsVerifyResponse = await provider.verifyCode('+34600000000', '1234')

    expect(result).toHaveProperty('valid')
    expect(result.valid).toBe(true)
  })

  it('sendVerificationCode returns failure on error', async () => {
    const failingProvider: SmsProvider = {
      async sendVerificationCode() {
        return { success: false, error: 'Service unavailable' }
      },
      async verifyCode() {
        return { valid: false, error: 'Not applicable' }
      },
    }

    const sendResult = await failingProvider.sendVerificationCode('+34600000000')
    expect(sendResult.success).toBe(false)
    expect(sendResult.error).toBe('Service unavailable')
    expect(sendResult.code).toBeUndefined()
  })

  it('verifyCode returns invalid on mismatch', async () => {
    const failingProvider: SmsProvider = {
      async sendVerificationCode() {
        return { success: true }
      },
      async verifyCode() {
        return { valid: false, error: 'Code mismatch' }
      },
    }

    const verifyResult = await failingProvider.verifyCode('+34600000000', '9999')
    expect(verifyResult.valid).toBe(false)
    expect(verifyResult.error).toBe('Code mismatch')
  })
})
