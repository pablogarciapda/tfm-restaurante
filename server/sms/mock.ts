/**
 * mock.ts — Mock SMS adapter (SM-002)
 *
 * Implements SmsProvider using the shared in-memory store from server/utils/sms-store.ts.
 * Always returns code "1234" for testing. Logs all calls to console.
 *
 * One-time use: verifyCode deletes the code on success so it cannot be reused.
 */

import type { SmsProvider, SmsSendResponse, SmsVerifyResponse } from '#shared/contracts/sms.contract'
import { storeCode, getCode, deleteCode } from '../utils/sms-store'

const FIXED_CODE = '1234'

export class MockSmsProvider implements SmsProvider {
  async sendVerificationCode(phone: string): Promise<SmsSendResponse> {
    console.log(`[MockSms] sendVerificationCode → ${phone}, code: ${FIXED_CODE}`)

    storeCode(phone, FIXED_CODE)

    return {
      success: true,
      code: FIXED_CODE, // exposed for testing
    }
  }

  async verifyCode(phone: string, code: string): Promise<SmsVerifyResponse> {
    console.log(`[MockSms] verifyCode → ${phone}, code: ${code}`)

    const entry = getCode(phone)

    if (!entry) {
      return { valid: false, error: 'No verification code found or expired' }
    }

    if (entry.code !== code) {
      return { valid: false, error: 'Code mismatch' }
    }

    // One-time use: delete on successful verify
    deleteCode(phone)

    return { valid: true }
  }

  async sendNotification(phone: string, message: string): Promise<SmsSendResponse> {
    console.log(`[MockSms] sendNotification → ${phone}: ${message}`)
    return { success: true }
  }

  async getBalance(): Promise<SmsBalanceResponse> {
    console.log('[MockSms] getBalance → returning 9999 (mock)')
    return { success: true, credits: 9999 }
  }
}
