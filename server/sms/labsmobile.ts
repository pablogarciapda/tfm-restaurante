/**
 * labsMobile.ts — LabsMobile SMS adapter (SM-003)
 *
 * Implements SmsProvider using the LabsMobile HTTP API.
 * - sendVerificationCode: POST to https://api.labsmobile.com/json/send with Basic auth.
 *   Generates a random 4-digit code, stores it via the shared sms-store.
 *   In test mode (labsMobileTest=1), no real SMS is sent.
 * - verifyCode: delegates to the shared in-memory sms-store.
 *   LabsMobile does NOT support server-side code verification.
 *
 * Config is injected via constructor (DI) to keep the adapter testable
 * without Nuxt runtime context. The factory (sms-factory.ts) reads useRuntimeConfig()
 * and passes the relevant values.
 */

import type { SmsProvider, SmsSendResponse, SmsVerifyResponse } from '../../shared/contracts/sms.contract'
import { storeCode, getCode, deleteCode } from '../utils/sms-store'

export interface LabsMobileConfig {
  username: string
  token: string
  sender: string
  testMode: string
}

type FetchError = Error & { response?: { status: number; _data?: unknown } }

export class LabsMobileProvider implements SmsProvider {
  private config: LabsMobileConfig

  constructor(config: LabsMobileConfig) {
    this.config = config
  }

  /** Generate a random 4-digit code (1000-9999) */
  private generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000))
  }

  private getAuthHeader(): string {
    const encoded = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')
    return `Basic ${encoded}`
  }

  async sendVerificationCode(phone: string): Promise<SmsSendResponse> {
    const code = this.generateCode()

    const payload = {
      message: `La Zingara: Tu codigo de verificacion es ${code}`,
      tpoa: this.config.sender,
      recipient: [{ msisdn: phone }],
      test: this.config.testMode,
    }

    try {
      await $fetch<{ code: string; message: string }>('https://api.labsmobile.com/json/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: payload,
      })

      // Store code for later verification
      storeCode(phone, code)

      return { success: true }
    } catch (err: unknown) {
      const fetchErr = err as FetchError

      if (fetchErr.response?.status === 401) {
        return { success: false, error: 'Invalid LabsMobile credentials' }
      }

      console.error('[LabsMobile] sendVerificationCode failed:', err)
      return { success: false, error: 'SMS service unavailable' }
    }
  }

  async verifyCode(phone: string, code: string): Promise<SmsVerifyResponse> {
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
}
