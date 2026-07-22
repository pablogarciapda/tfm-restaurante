/**
 * labsMobile.ts — LabsMobile SMS adapter (SM-003)
 *
 * Implements SmsProvider using the LabsMobile HTTP API.
 * - sendVerificationCode: POST to https://api.labsmobile.com/json/send with Basic auth.
 *   Generates a random 4-digit code, stores it via the shared sms-store.
 * - verifyCode: delegates to the shared in-memory sms-store.
 *   LabsMobile does NOT support server-side code verification.
 *
 * This adapter is ONLY used in real mode (labsMobileTest=0).
 * In test mode (labsMobileTest=1), the factory returns MockSmsProvider instead.
 *
 * Config is injected via constructor (DI) to keep the adapter testable
 * without Nuxt runtime context. The factory (sms-factory.ts) reads useRuntimeConfig()
 * and passes the relevant values.
 */

import type { SmsProvider, SmsSendResponse, SmsVerifyResponse } from '#shared/contracts/sms.contract'
import { storeCode, getCode, deleteCode } from '../utils/sms-store'

export interface LabsMobileConfig {
  username: string
  token: string
  sender: string
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
    const sender = this.config.sender

    const payload: Record<string, unknown> = {
      message: sender ? `${sender}: Tu codigo de verificacion es ${code}` : `Tu codigo de verificacion es ${code}`,
      recipient: [{ msisdn: phone }],
    }
    if (sender) payload.tpoa = sender

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

      // Log only the HTTP status + error message. The raw ofetch error object can
      // echo request headers (including Authorization: Basic <token>) — never log it.
      console.error('[LabsMobile] sendVerificationCode failed:', {
        status: fetchErr.response?.status,
        message: fetchErr.message,
      })
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

  async sendNotification(phone: string, message: string): Promise<SmsSendResponse> {
    const sender = this.config.sender
    const payload: Record<string, unknown> = {
      message,
      recipient: [{ msisdn: phone }],
    }
    if (sender) payload.tpoa = sender

    try {
      await $fetch<{ code: string; message: string }>('https://api.labsmobile.com/json/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: payload,
      })

      return { success: true }
    } catch (err: unknown) {
      const fetchErr = err as FetchError

      if (fetchErr.response?.status === 401) {
        return { success: false, error: 'Invalid LabsMobile credentials' }
      }

      console.error('[LabsMobile] sendNotification failed:', {
        status: fetchErr.response?.status,
        message: fetchErr.message,
      })
      return { success: false, error: 'SMS service unavailable' }
    }
  }

  async getBalance(): Promise<SmsBalanceResponse> {
    try {
      const data = await $fetch<{ code: number; credits?: string }>('https://api.labsmobile.com/json/balance', {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      })

      if (data.code !== 0) {
        console.error('[LabsMobile] getBalance failed: unexpected code', data.code)
        return { success: false, error: `Unexpected response code: ${data.code}` }
      }

      const credits = data.credits ? parseInt(data.credits, 10) : undefined
      return { success: true, credits }
    } catch (err: unknown) {
      const fetchErr = err as FetchError
      if (fetchErr.response?.status === 401) {
        return { success: false, error: 'Invalid LabsMobile credentials' }
      }
      console.error('[LabsMobile] getBalance failed:', {
        status: fetchErr.response?.status,
        message: fetchErr.message,
      })
      return { success: false, error: 'Balance service unavailable' }
    }
  }
}
