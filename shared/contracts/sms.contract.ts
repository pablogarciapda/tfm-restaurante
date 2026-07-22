/**
 * sms.contract.ts — Provider-agnostic SMS verification interface (SM-001)
 *
 * Defines SmsProvider interface and request/response types.
 * Lives in shared/ for client + server visibility.
 * Auto-imported in Nuxt 4 via imports.dirs: ['shared/contracts'].
 */

/** Request body for POST /api/sms/send */
export interface SmsSendRequest {
  phone: string
}

/** Response from a sendVerificationCode call */
export interface SmsSendResponse {
  success: boolean
  code?: string
  error?: string
}

/** Request body for POST /api/sms/verify */
export interface SmsVerifyRequest {
  phone: string
  code: string
}

/** Response from a verifyCode call */
export interface SmsVerifyResponse {
  valid: boolean
  error?: string
}

/** Response from a getBalance call */
export interface SmsBalanceResponse {
  success: boolean
  credits?: number
  error?: string
}

/**
 * SmsProvider — contract that every SMS adapter must implement.
 *
 * Method semantics:
 * - sendVerificationCode(phone): generate a code, send it (or simulate), store for later verify.
 *   Returns success + optional code (mock exposes code for testing; real providers do NOT).
 * - verifyCode(phone, code): check stored code matches + not expired.
 *   Returns valid: true/false + optional error string for context.
 * - sendNotification(phone, message): send a free-form SMS notification.
 *   No code storage — fire-and-forget.
 */
export interface SmsProvider {
  sendVerificationCode(phone: string): Promise<SmsSendResponse>
  verifyCode(phone: string, code: string): Promise<SmsVerifyResponse>
  sendNotification(phone: string, message: string): Promise<SmsSendResponse>
  /** Query remaining credits from the provider. Returns estimated count or -1 if unknown. */
  getBalance(): Promise<SmsBalanceResponse>
}
