# reservas-flow Specification

## Purpose

Reservation form at `/reservas` with multi-step SMS verification. User fills in personal data → enters phone → receives SMS code → verifies code → form submits. "Cliente elige mesa" mode is gated behind a disabled button with "Próximamente" tooltip. Mock submit to Nitro endpoint.

## Requirements

| ID | Requirement | RFC 2119 | Test Layer |
|----|------------|----------|------------|
| RF-001 | Form fields: nombre, teléfono (E.164 validation), email, fecha/hora, número de comensales (1-20). All required. Client-side validation before proceeding. | MUST | Unit |
| RF-002 | SMS verification step: after form fields valid → send code to phone → user enters code → verify → form completes. Verification is a REQUIRED pre-submit gate. | MUST | Integration |
| RF-003 | Code flow: POST /api/sms/send → user enters 4-digit code → POST /api/sms/verify → on success, submit enabled; on failure, retry (max 3) with error message; resend after 60s cooldown | MUST | Integration |
| RF-004 | "Cliente elige mesa" button disabled with "Próximamente" tooltip (title attribute or aria-describedby) | MUST | Unit |
| RF-005 | POST /api/reservas mock endpoint: receives form data + verified phone; returns 200 { success: true, id: "mock-xxx" } | MUST | Integration |

### Requirement: RF-001 — Form Fields and Validation

The system MUST render a form with: `nombre` (text, required), `teléfono` (tel, required, E.164 or Spanish mobile format validation), `email` (email, required, format validation), `fecha_hora` (datetime-local, required, future only), `numero_comensales` (number, required, 1-20). All fields MUST validate client-side before the SMS step.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| All fields valid | Form filled with valid data | Click "Continuar" | Proceeds to SMS verification step |
| Missing required field | "nombre" empty | Click "Continuar" | Error shown: "El nombre es obligatorio" |
| Invalid email format | email = "no-email" | Blur email field | Error shown: "Email no válido" |
| Phone format invalid | teléfono = "abc" | Blur phone field | Error shown: "Formato de teléfono no válido" |
| Past date rejected | fecha_hora = yesterday | Validate | Error shown: "La fecha debe ser futura" |
| Comensales out of range | comensales = 0 or 21 | Validate | Error shown: "Entre 1 y 20 comensales" |

### Requirement: RF-002 — SMS Verification Step

The system MUST present an SMS verification step after form validation passes. The step MUST show: phone number confirmation, code input (4-digit), verify button, resend link (with cooldown). Form submission MUST be disabled until verification succeeds.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Verification step appears | Form validated, "Continuar" clicked | Transition to step 2 | Phone shown, code input visible, submit disabled |
| Code input limited to 4 digits | Code input focused | Type digits | Only 4 numeric characters accepted |

### Requirement: RF-003 — Send → Verify → Submit Flow

The system MUST call `POST /api/sms/send` with `{ phone }` to request a code. The user enters the received code and clicks "Verificar", which calls `POST /api/sms/verify` with `{ phone, code }`. On success: submit button enables. On failure: error message, retry counter (max 3 attempts). Resend available after 60s cooldown.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path: send + verify | Phone entered, step 2 active | Send code → receive "1234" → enter code → verify | Verification success; submit enabled |
| Wrong code | Code "0000" sent, user enters "9999" | Click "Verificar" | Error: "Código incorrecto"; 2 attempts remaining |
| Max retries reached | 3 failed verification attempts | Enter wrong code 4th time | Input disabled; message: "Demasiados intentos. Solicite un nuevo código." |
| Resend cooldown | Code requested | Click "Reenviar" immediately | Button disabled; countdown "Reenviar en 60s" shown |
| Resend after cooldown | 60s elapsed | Click "Reenviar" | New code sent; retry counter resets |

### Requirement: RF-004 — "Cliente Elige Mesa" Gated

The system MUST render a button or section labeled "Elegir mesa" (or similar) on `/reservas`. The button MUST be `disabled` and MUST display a tooltip: "Próximamente" (via `title` attribute or `aria-describedby`).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Button disabled | `/reservas` page loads | Inspect "Elegir mesa" button | `disabled` attribute present; tooltip "Próximamente" shown on hover |
| Cannot interact | Button disabled | Click button | No action triggered |

### Requirement: RF-005 — Mock Submit Endpoint

The system MUST POST reservation data to `POST /api/reservas` after successful SMS verification. The mock endpoint MUST return `200 { success: true, id: "mock-<random>" }`. Request body: `{ nombre, telefono, email, fecha_hora, numero_comensales, estado: "pendiente" }`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Successful submit | Form valid, SMS verified | POST /api/reservas | Response 200; { success: true, id } |
| Submit shows confirmation | POST succeeds | Await response | Confirmation message shown: "Reserva confirmada" |

## Edge Cases

- **Phone format**: accept +34 Spanish mobile (6XX XXX XXX or +346XXXXXXXX), reject landlines
- **Expired code**: if code older than 10 minutes → verify returns false; user must resend
- **Concurrent submits**: disable submit button after first click to prevent double-submit
- **Network error on send**: show "Error al enviar el código. Inténtelo de nuevo."
- **Network error on verify**: show "Error al verificar. Inténtelo de nuevo."
- **SSR**: form renders empty on server; client hydrates with empty state — no mismatch
