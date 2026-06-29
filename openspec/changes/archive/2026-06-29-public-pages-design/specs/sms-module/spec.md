# sms-module Specification

## Purpose

Provider-agnostic SMS verification module. Defines a contract interface (`SmsProvider`) in `shared/contracts/`, a mock adapter for development, and a LabsMobile adapter for production. Provider selection via `SMS_PROVIDER` environment variable. Nitro server endpoints expose send/verify to the client without leaking credentials.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| SM-001 | `SmsProvider` interface in `shared/contracts/sms.contract.ts`: `sendVerificationCode(phone): Promise<{success, code?}>`, `verifyCode(phone, code): Promise<boolean>` | MUST | — (type-level) |
| SM-002 | Mock adapter `server/sms/mock.ts`: returns `{ success: true, code: "1234" }`, logs to console. Implements SmsProvider. | MUST | Unit |
| SM-003 | LabsMobile adapter `server/sms/labsmobile.ts`: POST to `https://api.labsmobile.com/json/send`, Basic auth (username:token), JSON body `{message, tpoa, recipient:[{msisdn}], test:"1"}`, parses response | MUST | Integration |
| SM-004 | Provider selection via `SMS_PROVIDER` env var (`mock` | `labsmobile`). Default if unset: `mock`. Invalid value → server logs warning, falls back to mock. | MUST | Integration |
| SM-005 | Nitro endpoints: `POST /api/sms/send` (body: `{phone}` → `{success, code?}`), `POST /api/sms/verify` (body: `{phone, code}` → `{valid}`) | MUST | Integration |
| SM-006 | Security: LabsMobile credentials (username, token) read from `process.env` server-side ONLY. Never exposed to client. Endpoints MUST NOT leak API token in responses or logs. | MUST | Integration |

### Requirement: SM-001 — SmsProvider Interface

The system MUST define `SmsProvider` interface in `shared/contracts/sms.contract.ts`:

```ts
export interface SmsProvider {
  sendVerificationCode(phone: string): Promise<{ success: boolean; code?: string }>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}
```

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Interface compiles | TypeScript strict mode | Build project | No type errors referencing SmsProvider |
| Both adapters satisfy it | Mock + LabsMobile adapters exist | Type-check | Both implement SmsProvider without error |

### Requirement: SM-002 — Mock Adapter

The system MUST provide `server/sms/mock.ts` implementing SmsProvider. `sendVerificationCode` MUST return `{ success: true, code: "1234" }` and `console.log` the call. `verifyCode` MUST return `true` when code === "1234", `false` otherwise.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Send returns fixed code | SMS_PROVIDER=mock | sendVerificationCode("+34600000000") | Returns { success: true, code: "1234" } |
| Verify correct code | Mock adapter | verifyCode("+34600000000", "1234") | Returns true |
| Verify wrong code | Mock adapter | verifyCode("+34600000000", "0000") | Returns false |
| Logs to console | Mock adapter | Any method called | console.log output visible in server logs |

### Requirement: SM-003 — LabsMobile Adapter

The system MUST provide `server/sms/labsmobile.ts` implementing SmsProvider. It MUST call LabsMobile API: `POST https://api.labsmobile.com/json/send` with Basic auth (username:tokenapi), JSON body `{ message, tpoa, recipient: [{ msisdn }], test: "1" }`. In test mode (`LABSMOBILE_TEST=1`), no real SMS is sent. The adapter MUST parse the API response to determine success.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Test mode sends simulated | LABSMOBILE_TEST=1, valid credentials | sendVerificationCode("+34600000000") | API call succeeds; no credit deducted; returns success |
| Invalid credentials handled | Wrong LABSMOBILE_TOKEN | sendVerificationCode | Returns { success: false }; error logged |
| Auth header correct | LabsMobile adapter | Inspect request | Authorization: Basic base64(username:token) |
| Code generated server-side | Adapter sends SMS | Call completes | Code is 4-digit random; stored temporarily for verify |

### Requirement: SM-004 — Provider Selection

The system MUST read `SMS_PROVIDER` from environment (via `useRuntimeConfig()` or `process.env`). Valid values: `mock`, `labsmobile`. If unset or invalid, MUST default to `mock` and log a warning.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| SMS_PROVIDER=mock | .env has SMS_PROVIDER=mock | POST /api/sms/send | Mock adapter handles request |
| SMS_PROVIDER=labsmobile | .env has SMS_PROVIDER=labsmobile | POST /api/sms/send | LabsMobile adapter handles request |
| Unset defaults to mock | No SMS_PROVIDER in env | Server starts | Warning logged; mock adapter used |
| Invalid value falls back | SMS_PROVIDER=invalid | Server starts | Warning logged; mock adapter used |

### Requirement: SM-005 — Nitro Endpoints

The system MUST expose: `POST /api/sms/send` (accepts `{ phone }`, returns `{ success: boolean, code?: string }`) and `POST /api/sms/verify` (accepts `{ phone, code }`, returns `{ valid: boolean }`). Both MUST use the selected SmsProvider instance. Codes MUST be stored server-side (in-memory Map) scoped to phone number, with 10-minute expiry.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Send endpoint returns success | POST /api/sms/send { phone: "+34600000000" } | Request | 200 { success: true, code: "1234" } (mock) |
| Verify correct code | Code sent earlier | POST /api/sms/verify { phone, code: "1234" } | 200 { valid: true } |
| Verify wrong code | Code sent earlier | POST /api/sms/verify { phone, code: "0000" } | 200 { valid: false } |
| Missing body fields | POST missing phone | Request | 400 { error: "phone is required" } |
| Expired code | Code older than 10 min | POST verify | 200 { valid: false } |

### Requirement: SM-006 — Security

LabsMobile credentials (username, token) MUST be read from server-side environment ONLY (`process.env.LABSMOBILE_USERNAME`, `process.env.LABSMOBILE_TOKEN`). They MUST NOT appear in client-side bundles, API responses, console logs (except masked), or error messages.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Credentials server-only | Any client page loads | Inspect source/network | No LABSMOBILE_USERNAME or TOKEN in bundle |
| Error response sanitized | LabsMobile API returns auth error | Endpoint responds | Response says "SMS service unavailable"; no token leaked |
| Logs masked | LabsMobile adapter logs | Check server console | Token not in plaintext; masked like "toke***" |

## Edge Cases

- **Provider unreachable/timeout**: LabsMobile API times out (>10s) → endpoint returns 503; user sees "Servicio no disponible"
- **Invalid credentials**: LabsMobile returns 401 → adapter returns `{ success: false }`; endpoint logs warning
- **Concurrent send requests**: same phone called twice within cooldown → second call returns existing code (idempotent) or 429
- **Code storage**: in-memory Map, not persistent; survives server restart only if using session store; acceptable for mock/Phase 1
- **Test mode ack**: LabsMobile `test:"1"` returns simulated success; adapter must still validate the response structure
