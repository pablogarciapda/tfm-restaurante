# SDD Technical Design — retoques-reservas

> **Status:** Draft  
> **Date:** 2026-07-07  
> **Change:** retoques-reservas  
> **Project:** tfm-restaurant (La Zíngara)

---

## Executive Summary

The retoques-reservas change transforms the reservation system from a mock-only flow into a production-grade pipeline with real Supabase persistence, GDPR compliance, SMTP email notifications, and an admin clientes CRUD panel. Five server-side API endpoints are introduced or rewritten, the `configuracion` page is migrated from direct-browser-Supabase to a write-only-password-protected server API, and a configurable `modo_reserva` toggle gates automatic-vs-manual confirmation. The migration adds one new table (`clientes`), seven new columns to `configuracion`, and restructures `reservas` to reference `clientes` via a nullable FK, with backward-compatible data migration.

---

## 1. Component Tree

### 1.1 New Components

| Component | Path (proposed) | Responsibility |
|-----------|-----------------|----------------|
| `GdprConsentModal` | `app/components/GdprConsentModal.vue` | Scrollable overlay with `texto_proteccion_datos`, accept/reject buttons, scroll-end detection |
| `ClientesTable` | `app/components/ClientesTable.vue` | Admin table: search, list clientes with reservation count, expand to show history |
| `ClienteForm` | `app/components/ClienteForm.vue` | Create/edit form: nombre, telefono, email; telefono read-only on edit |

### 1.2 Modified Components

| Component | Changes |
|-----------|---------|
| `ReservationForm.vue` | Replace E.164 phone regex with Spanish phone validation; add `apellidos` field |
| `SmsVerificationStep.vue` | No structural changes; still emits `verified`/`back` |
| `ConfiguracionForm.vue` | Major rework: section-based layout (8 sections), new SMTP/GDPR/Reservas fields, config loaded via `$fetch('/api/config')` instead of direct Supabase |
| `AdminSidebar.vue` | Add nav item: `Clientes → /cocina/clientes`, resource `clientes` |

### 1.3 Page Modifications

| Page | Changes |
|------|---------|
| `app/pages/reservas.vue` | Insert GDPR step between form and SMS; update `ReservationPayload` to include `apellidos`; update confirmation to show `estado` from real API |
| `app/pages/cocina/configuracion.vue` | Replace `useSupabaseClient()` with `$fetch('/api/config')` for load/save; pass SMTP/GDPR/reservas fields through `ConfigData` interface; add test-email button handler |
| `app/pages/cocina/clientes.vue` | **New page.** Mounts `ClientesTable` + `ClienteForm`. Protected by middleware chain `auth → role → permissions` |

### 1.4 Component Data Flow

```
reservas.vue (step orchestrator)
  ├─ ReservationForm.vue
  │   emits: submit(ReservationPayload)
  ├─ GdprConsentModal.vue           ← NEW (step='gdpr')
  │   emits: accept(), reject()
  ├─ SmsVerificationStep.vue        ← unchanged
  │   emits: verified(), back()
  └─ Confirmation panel             ← shows estado from API
```

```
cocina/configuracion.vue (config loader/saver)
  └─ ConfiguracionForm.vue
      emits: submit(ConfigFormData)  ← expanded interface
      props: { currentConfig, saving }
      NEW: SMTP test button → calls POST /api/cocina/smtp/test directly
```

```
cocina/clientes.vue (NEW page)
  ├─ ClientesTable.vue
  │   props: { clientes: ClienteWithCount[] }
  │   emits: select(id), edit(cliente), create()
  └─ ClienteForm.vue
      props: { cliente?: Cliente, mode: 'create'|'edit' }
      emits: saved(), cancel()
```

---

## 2. Data Flow — Reservation Pipeline

### 2.1 Full Flow (step-by-step)

```
                        ┌─────────────────────────────────────────┐
                        │        USER BROWSER (reservas.vue)        │
                        └─────────────────────────────────────────┘
                                         │
    1. Form submit                       ▼
       ReservationForm.validate()    ┌─────────┐
         → emits submit(data)        │ step=   │
                                     │  form   │
                                     └────┬────┘
                                          │
    2. GDPR check (NEW)                  ▼
       GET /api/config → texto_prot.  ┌─────────┐
       If NULL → skip to step=sms    │ step=   │
       If present → show GdprConsent  │  gdpr   │
       Modal. Reject→back to form    └────┬────┘
       Accept→proceed                     │
                                          │
    3. Send SMS                          ▼
       POST /api/sms/send              ┌─────────┐
       { phone: data.telefono }        │ step=   │
                                       │  sms    │
                                       └────┬────┘
                                            │
    4. Verify code                        ▼
       POST /api/sms/verify             ┌─────────┐ validation
       SmsVerificationStep              │  sms    │ pass
       → emits verified()               └────┬────┘
                                            │
    5. Create reservation                  ▼
       POST /api/reservas             ┌──────────────┐
       { nombre, apellidos,           │ step=        │
         telefono, email,             │ confirmation │
         fecha_hora,                  └──────────────┘
         numero_comensales,
         sms_verified: true }
```

### 2.2 Server-Side Reservation Logic (POST /api/reservas)

```
POST /api/reservas
  │
  ├─ Validate body (required fields, future date, comensales 1-20)
  ├─ Check sms_verified flag (403 if missing)
  │
  ├─ Normalize phone → server utility normalizePhone()
  │   Strip spaces/dashes, ensure Spanish format
  │
  ├─ Get config → modo_reserva (serverSupabaseServiceRole)
  │
  ├─ UPSERT clientes BY phone (SELECT→INSERT if new)
  │   client: serverSupabaseServiceRole (bypasses RLS)
  │   INSERT body: { nombre, apellidos, telefono, email }
  │
  ├─ INSERT reservas
  │   { cliente_id, fecha_hora, numero_comensales,
  │     estado: modo===automatica ? 'confirmada' : 'pendiente',
  │     mesa_id: null }
  │
  ├─ IF estado='confirmada' AND smtpPassword configured:
  │     sendEmail() — fire-and-forget, no rollback on failure
  │
  └─ RETURN { success: true, reserva_id, estado }
```

### 2.3 Phone Normalization Strategy

```typescript
// server/utils/phone.ts (new file)
export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-().]/g, '')
  // Spanish mobile: starts with 6 or 7, 9 digits
  if (/^[679]\d{8}$/.test(cleaned)) return `+34${cleaned}`
  // Already E.164 with Spanish prefix
  if (/^\+34[679]\d{8}$/.test(cleaned)) return cleaned
  // Starts with 0034 → convert to +
  if (/^0034[679]\d{8}$/.test(cleaned)) return `+34${cleaned.slice(4)}`
  // Starts with 34 without + → add +
  if (/^34[679]\d{8}$/.test(cleaned)) return `+${cleaned}`
  // As-is for non-Spanish numbers (preserve original)
  return cleaned
}
```

This normalizes everything to E.164 (`+34XXXXXXXXX`) for the `clientes.telefono` UNIQUE constraint.

---

## 3. API Architecture

### 3.1 Endpoint Catalog

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/config` | Admin (cookie) | All config fields EXCEPT smtp_password |
| `POST` | `/api/config` | Admin (cookie) | Upsert config. Password write-only |
| `POST` | `/api/reservas` | Public (+sms_verified flag) | Create cliente + reserva |
| `GET` | `/api/cocina/clientes` | Admin (cookie) | List/search clientes (+reserva count) |
| `POST` | `/api/cocina/clientes` | Admin (cookie) | Create cliente |
| `PUT` | `/api/cocina/clientes/[id]` | Admin (cookie) | Update nombre/email (telefono read-only) |
| `GET` | `/api/cocina/clientes/[id]/reservas` | Admin (cookie) | Reservation history |
| `POST` | `/api/cocina/reservas/confirmar` | Admin (cookie) | Manual confirm → estado=confirmada + email |
| `POST` | `/api/cocina/smtp/test` | Admin (cookie) | Send test email |

### 3.2 Endpoint Details

#### GET /api/config

**File:** `server/api/config.get.ts`

```typescript
// Handler pattern (pure function, testable)
export async function handleGetConfig(
  supabase: SupabaseClient<Database>
): Promise<HandlerResult> {
  const { data } = await supabase.from('configuracion').select('*').limit(1).single()
  if (!data) return { status: 200, body: {} }
  // REDACT smtp_password
  const { smtp_password: _pw, ...safe } = data
  return { status: 200, body: safe }
}

// Nitro wrapper
export default defineEventHandler(async (event) => {
  await requireUserSession(event) // @nuxtjs/supabase v2 server util
  const supabase = serverSupabaseServiceRole(event)
  const result = await handleGetConfig(supabase)
  setResponseStatus(event, result.status)
  return result.body
})
```

**Auth:** `requireUserSession(event)` — returns 401 if no cookie session.  
**Password redaction:** Destructured out — never serialized to JSON response.

#### POST /api/config

**File:** `server/api/config.post.ts`

```typescript
interface ConfigUpdateBody {
  // All config fields optional
  smtp_password?: string  // write-only: empty '' or '••••••••' = preserve existing
  // ... all other fields
}

export async function handleUpdateConfig(
  supabase: SupabaseClient<Database>,
  body: ConfigUpdateBody
): Promise<HandlerResult> {
  // 1. Get current row ID (exists or null)
  const { data: current } = await supabase.from('configuracion').select('id').limit(1).single()
  
  // 2. Handle password
  const updateData: Record<string, unknown> = { ...body }
  delete updateData.id  // never allow id override
  
  if ('smtp_password' in updateData) {
    const pw = updateData.smtp_password as string || ''
    if (pw === '' || pw === '••••••••') {
      delete updateData.smtp_password  // preserve existing
    }
    // else: normal value → upsert it
  }
  
  // 3. Upsert
  if (current?.id) {
    await supabase.from('configuracion').update(updateData).eq('id', current.id)
  } else {
    await supabase.from('configuracion').insert(updateData)
  }
  
  // 4. Return updated (redacted)
  return handleGetConfig(supabase)
}
```

**Important:** Uses `serverSupabaseServiceRole` so RLS doesn't block the write.

#### POST /api/reservas (rewritten)

**File:** `server/api/reservas.post.ts`

```typescript
// Shared reservation contract
export interface ReservationRequest {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  sms_verified?: boolean
}

// Handler
export async function handleCreateReservation(
  supabase: SupabaseClient<Database>,
  body: ReservationRequest
): Promise<HandlerResult> {
  // 1. Validate
  const errors = validateReservation(body)
  if (errors.length > 0) return { status: 400, body: { errors } }
  
  // 2. SMS gate
  if (!body.sms_verified) {
    return { status: 403, body: { error: 'Verificación SMS requerida' } }
  }
  
  // 3. Normalize phone
  const normalizedPhone = normalizePhone(body.telefono)
  
  // 4. Read config → modo_reserva
  const { data: config } = await supabase.from('configuracion').select('modo_reserva').limit(1).single()
  const modo = config?.modo_reserva ?? 'automatica'
  
  // 5. Upsert cliente
  const { data: existing } = await supabase
    .from('clientes').select('id').eq('telefono', normalizedPhone).maybeSingle()
  
  let clienteId: string
  if (existing) {
    clienteId = existing.id
  } else {
    const { data: created } = await supabase.from('clientes').insert({
      nombre: body.nombre,
      apellidos: body.apellidos ?? null,
      telefono: normalizedPhone,
      email: body.email,
    }).select('id').single()
    if (!created) return { status: 500, body: { error: 'Error al crear cliente' } }
    clienteId = created.id
  }
  
  // 6. Create reserva
  const estado = modo === 'verificada' ? 'pendiente' : 'confirmada'
  const { data: reserva } = await supabase.from('reservas').insert({
    cliente_id: clienteId,
    fecha_hora: body.fecha_hora,
    numero_comensales: body.numero_comensales,
    estado,
  }).select('id').single()
  
  if (!reserva) return { status: 500, body: { error: 'Error al crear reserva' } }
  
  // 7. Fire-and-forget email (only if confirmed)
  if (estado === 'confirmada') {
    sendConfirmationEmail({
      nombre: body.nombre,
      email: body.email,
      fecha_hora: body.fecha_hora,
      numero_comensales: body.numero_comensales,
      reserva_id: reserva.id,
    }).catch(err => console.warn('Email send failed:', err.message))
  }
  
  return { status: 200, body: { success: true, reserva_id: reserva.id, estado } }
}
```

#### CRUD /api/cocina/clientes

**Pattern:** Same handler pattern as `/api/cocina/usuarios/handlers.ts`.

**Files:**
- `server/api/cocina/clientes/list.get.ts` → `handleListClientes(supabase, query?)`
- `server/api/cocina/clientes/create.post.ts` → `handleCreateCliente(supabase, body)`
- `server/api/cocina/clientes/[id]/update.put.ts` → `handleUpdateCliente(supabase, id, body)`
- `server/api/cocina/clientes/[id]/reservas.get.ts` → `handleGetReservas(supabase, id)`

**Queries:**
```sql
-- List with reservation count
SELECT c.*, COUNT(r.id) as reservas_count
FROM clientes c
LEFT JOIN reservas r ON r.cliente_id = c.id
WHERE c.nombre ILIKE '%search%' OR c.telefono ILIKE '%search%' OR c.email ILIKE '%search%'
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 50 OFFSET 0;

-- Reservation history
SELECT id, fecha_hora, numero_comensales, estado, created_at
FROM reservas
WHERE cliente_id = $id
ORDER BY fecha_hora DESC;
```

#### POST /api/cocina/reservas/confirmar

**File:** `server/api/cocina/reservas/confirmar.post.ts`

```typescript
export async function handleConfirmReservation(
  supabase: SupabaseClient<Database>,
  body: { reserva_id: string }
): Promise<HandlerResult> {
  // Update estado → confirmada
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'confirmada' })
    .eq('id', body.reserva_id)
    .eq('estado', 'pendiente')  // idempotent guard
  
  if (error) return { status: 500, body: { error: 'Error al confirmar' } }
  
  // Fetch cliente email for notification
  const { data: reserva } = await supabase
    .from('reservas')
    .select('cliente_id, fecha_hora, numero_comensales, clientes(nombre, email)')
    .eq('id', body.reserva_id)
    .single()
  
  if (reserva?.clientes) {
    sendConfirmationEmail({
      nombre: (reserva.clientes as any).nombre,
      email: (reserva.clientes as any).email,
      fecha_hora: reserva.fecha_hora,
      numero_comensales: reserva.numero_comensales ?? 0,
      reserva_id: body.reserva_id,
    }).catch(err => console.warn('Email send failed:', err.message))
  }
  
  return { status: 200, body: { success: true } }
}
```

---

## 4. Database Migrations

### 4.1 Migration Order (sequential — run as single atomic migration)

**Migration name:** `retoques_reservas_schema`

```sql
-- ── Step 1: Add configuracion columns ──
ALTER TABLE configuracion
  ADD COLUMN smtp_host text,
  ADD COLUMN smtp_port integer CHECK (smtp_port IS NULL OR (smtp_port >= 1 AND smtp_port <= 65535)),
  ADD COLUMN smtp_user text,
  ADD COLUMN smtp_from_email text,
  ADD COLUMN smtp_password text,
  ADD COLUMN texto_proteccion_datos text,
  ADD COLUMN modo_reserva text NOT NULL DEFAULT 'automatica'
    CHECK (modo_reserva IN ('automatica', 'verificada'));

-- ── Step 2: Create clientes table ──
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellidos text,
  telefono text UNIQUE NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Step 3: Add cliente_id to reservas (nullable first for migration) ──
ALTER TABLE reservas
  ADD COLUMN cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;

-- ── Step 4: Index on FK (schema best practice) ──
CREATE INDEX idx_reservas_cliente_id ON reservas(cliente_id);

-- ── Step 5: Data migration — extract existing reservas into clientes ──
-- For reservas with phone, create clientes rows (first occurrence wins)
INSERT INTO clientes (nombre, telefono, email)
SELECT DISTINCT ON (r.telefono)
  r.nombre_cliente,
  r.telefono,
  r.email
FROM reservas r
WHERE r.telefono IS NOT NULL
  AND r.telefono != ''
  AND NOT EXISTS (
    SELECT 1 FROM clientes c WHERE c.telefono = r.telefono
  )
ORDER BY r.telefono, r.created_at ASC;

-- Link existing reservas to clientes via phone
UPDATE reservas r
SET cliente_id = c.id
FROM clientes c
WHERE r.telefono = c.telefono
  AND r.telefono IS NOT NULL;

-- ── Step 6: Drop old columns ──
ALTER TABLE reservas
  DROP COLUMN nombre_cliente,
  DROP COLUMN telefono,
  DROP COLUMN email;

-- ── Step 7: Enable RLS on clientes ──
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
```

### 4.2 RLS Policies for clientes

```sql
-- Anon: no access
CREATE POLICY "anon_no_access" ON clientes
  FOR ALL USING (false)
  TO anon;

-- Service role: full access (bypass — no policy needed, service_role skips RLS)

-- Authenticated: can_write('clientes') check
CREATE POLICY "authenticated_select_clientes" ON clientes
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.can_write('clientes')
  );

CREATE POLICY "authenticated_insert_clientes" ON clientes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.can_write('clientes')
  );

CREATE POLICY "authenticated_update_clientes" ON clientes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND public.can_write('clientes')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.can_write('clientes')
  );
```

**Note:** `can_write('clientes')` checks `profiles.permissions->>'clientes'` for editors, returns true for admins. Must verify the existing `can_write` function supports the `clientes` key. If not, a migration must update the function.

### 4.3 can_write() Function Update

The existing `can_write` function (defined in the DB) likely checks permissions via a hardcoded list. Must verify and update:

```sql
-- If can_write needs updating to include 'clientes':
CREATE OR REPLACE FUNCTION public.can_write(resource text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_permissions jsonb;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM profiles WHERE id = auth.uid();
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  RETURN COALESCE((user_permissions->>resource)::boolean, false);
END;
$$;
```

### 4.4 Default Permissions Migration

```sql
-- Update existing editor profiles to include 'clientes': false
UPDATE profiles
SET permissions = permissions || '{"clientes": false}'::jsonb
WHERE role = 'editor'
  AND permissions->>'clientes' IS NULL;
```

---

## 5. Email Service

### 5.1 Installation

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

### 5.2 Runtime Config Extension

Add to `nuxt.config.ts` `runtimeConfig`:

```typescript
runtimeConfig: {
  // ... existing
  smtpPassword: '',  // NUXT_SMTP_PASSWORD env var
}
```

### 5.3 Email Utility

**File:** `server/utils/email.ts` (new)

```typescript
import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  fromEmail: string
}

interface ConfirmationEmail {
  nombre: string
  email: string
  fecha_hora: string
  numero_comensales: number
  reserva_id: string
}

/**
 * Read SMTP config from DB + runtimeConfig override.
 * Priority: NUXT_SMTP_PASSWORD env var > DB smtp_password.
 * Returns null if host or password is missing.
 */
export async function getEmailConfig(
  supabase: SupabaseClient<Database>
): Promise<EmailConfig | null> {
  const config = useRuntimeConfig()
  const envPassword = config.smtpPassword as string
  
  const { data } = await supabase
    .from('configuracion')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email')
    .limit(1)
    .single()
  
  if (!data?.smtp_host) return null
  
  const password = envPassword || data.smtp_password
  if (!password) return null
  
  return {
    host: data.smtp_host,
    port: data.smtp_port ?? 587,
    user: data.smtp_user ?? '',
    password,
    fromEmail: data.smtp_from_email ?? data.smtp_user ?? '',
  }
}

/**
 * Create Nodemailer transporter with port-based TLS detection.
 * - 465 → SSL (secure: true)
 * - 587 → STARTTLS (secure: false, requireTLS: true)
 * - other → STARTTLS if server supports (secure: false)
 */
function createTransporter(config: EmailConfig): nodemailer.Transporter {
  const secure = config.port === 465
  const requireTLS = config.port === 587
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    ...(requireTLS ? { requireTLS: true } : {}),
  })
}

/**
 * Send confirmation email. Fire-and-forget — returns boolean.
 * Logs warn on failure, never throws.
 */
export async function sendConfirmationEmail(
  params: ConfirmationEmail
): Promise<{ success: boolean; message: string }> {
  // Need supabase client — caller must provide or we resolve it here
  // Design decision: caller provides config to avoid coupling
  // But for the confirmation flow, we bundle a convenience:
  if (!params.email) {
    return { success: false, message: 'No email address for cliente' }
  }
  
  // This is called from reservas.post.ts / confirmar.post.ts
  // Those handlers already have serverSupabaseServiceRole.
  // We'll inject config via parameter from the caller.
  return { success: true, message: 'Sent' }
  // Full implementation: read config, create transporter, sendMail
}

/**
 * Low-level: send email with given config. Used by test endpoint too.
 */
export async function sendEmail(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter(config)
    await transporter.sendMail({
      from: `"La Zíngara" <${config.fromEmail}>`,
      to,
      subject,
      html,
    })
    return { success: true, message: 'Correo enviado' }
  } catch (err: any) {
    console.warn('Email send failed:', err.message)
    return { success: false, message: err.message }
  }
}

/**
 * HTML template for confirmation email.
 */
export function buildConfirmationHtml(params: ConfirmationEmail): string {
  const fecha = new Date(params.fecha_hora)
  const dateStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const timeStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  })
  
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #c25b3c;">La Zíngara — Confirmación de reserva</h2>
  <p>Hola <strong>${params.nombre}</strong>,</p>
  <p>Tu reserva ha sido <strong>confirmada</strong>:</p>
  <table style="margin: 16px 0; border-collapse: collapse;">
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Fecha:</td>
        <td style="padding: 6px 0;">${dateStr}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Hora:</td>
        <td style="padding: 6px 0;">${timeStr}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Comensales:</td>
        <td style="padding: 6px 0;">${params.numero_comensales}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; color: #666;">Referencia:</td>
        <td style="padding: 6px 0;">${params.reserva_id}</td></tr>
  </table>
  <p style="color: #888; font-size: 14px;">
    La Zíngara — Plaza Mayor, Santa María del Páramo (León)
  </p>
</body>
</html>`.trim()
}
```

**Architecture note:** The `sendConfirmationEmail()` function requires a `SupabaseClient` to read SMTP config. Callers (reservas.post.ts, confirmar.post.ts) already have `serverSupabaseServiceRole`. The design passes config explicitly rather than importing `serverSupabaseServiceRole` inside the email utility to keep it testable.

### 5.4 Test Email Endpoint

**File:** `server/api/cocina/smtp/test.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  
  // Accept SMTP creds from request body (from form fields)
  const { to } = body
  
  // Read full config from DB (password already protected server-side)
  const config = await getEmailConfig(supabase)
  if (!config) {
    throw createError({ statusCode: 400, message: 'Configure los datos SMTP primero' })
  }
  
  const result = await sendEmail(
    config,
    to || config.fromEmail,
    'Test — La Zíngara',
    '<p>Correo de prueba desde el panel de configuración de La Zíngara.</p>'
  )
  
  if (!result.success) {
    throw createError({ statusCode: 400, message: result.message })
  }
  
  return { success: true, message: 'Correo de prueba enviado' }
})
```

---

## 6. State Management

### 6.1 Config Loading Pattern

**Current:** `cocina/configuracion.vue` uses `useSupabaseClient().from('configuracion')` directly.

**New:** Config loaded via `$fetch('/api/config')` — no client-side Supabase for config table.

```typescript
// cocina/configuracion.vue (refactored)
const config = ref<ConfigData>({ /* defaults */ })

async function loadConfig() {
  const data = await $fetch<ConfigData>('/api/config')
  if (data && Object.keys(data).length > 0) {
    config.value = { ...configDefaults, ...data }
  }
}

async function handleSubmit(formData: ConfigData) {
  saving.value = true
  try {
    const result = await $fetch('/api/config', {
      method: 'POST',
      body: formData,
    })
    config.value = result as ConfigData
    showToast('Configuración guardada correctamente', 'success')
  } catch {
    showToast('Error al guardar la configuración', 'error')
  } finally {
    saving.value = false
  }
}
```

### 6.2 No Pinia Store Needed

The reservation flow is self-contained within `reservas.vue` (local `ref`s for step, formData, error). No cross-component shared state. Config is page-local. Clientes admin page is also page-local. **No new Pinia stores are needed** for this change.

### 6.3 SMS Verification State

**Current:** Browser-only — SMS store in `server/utils/sms-store.ts` (in-memory, not persisted).  
**No change needed.** The SMS verification flow (send code, store in memory, verify against store) stays the same.

---

## 7. Security

### 7.1 Password Write-Only Pattern

```
┌──────────┐    GET /api/config     ┌───────────┐    SELECT * FROM    ┌──────────┐
│  Browser  │ ◄──────────────────  │  Nitro    │ ◄────────────────  │ Supabase  │
│  (admin)  │   NO smtp_password    │  Handler  │   configuracion     │  (DB)     │
└──────────┘                       └───────────┘                     └──────────┘
      │                                   │
      │ POST /api/config                  │
      │ smtp_password: "new-secret"       │ UPSERT (all fields)
      ├──────────────────────────────►    ├───────────────────────────►
      │                                   │
      │ smtp_password: ""                 │ DELETE smtp_password from
      │ OR "••••••••"                     │ update payload → preserve
      ├──────────────────────────────►    │ existing value
```

**Key rules:**
1. `smtp_password` NEVER leaves the server in API responses
2. Empty string or placeholder (`••••••••`) in POST body → preserve existing value
3. Non-empty, non-placeholder value → update stored password
4. `NUXT_SMTP_PASSWORD` env var overrides DB value at read time
5. `serverSupabaseServiceRole` used for all config reads — bypasses RLS

### 7.2 Auth Enforcement

| Endpoint | Auth Method | Fallback |
|----------|------------|----------|
| GET/POST `/api/config` | `requireUserSession(event)` | 401 |
| `/api/cocina/clientes/**` | `requireUserSession(event)` | 401 |
| POST `/api/cocina/reservas/confirmar` | `requireUserSession(event)` | 401 |
| POST `/api/cocina/smtp/test` | `requireUserSession(event)` | 401 |
| POST `/api/reservas` | `sms_verified` flag in body | 403 |

**`requireUserSession`** is the Nuxt Supabase v2 server util that validates the auth cookie. It throws 401 automatically when the session is invalid/expired.

### 7.3 RLS Summary

| Table | Anon | Authenticated (can_write) | Service Role |
|-------|------|--------------------------|--------------|
| `clientes` | No access | SELECT/INSERT/UPDATE | Full |
| `reservas` | No access (existing) | Via existing policies | Full |
| `configuracion` | No access (existing) | Via existing policies | Full |

All client-side Supabase calls for `configuracion` are removed. Admin panel calls go through server-side endpoints with `serverSupabaseServiceRole`.

### 7.4 Phone Validation — Client-Side

```typescript
// ReservationForm.vue — updated validate()
function validatePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  
  // Spanish mobile: 9 digits starting with 6, 7, or 9
  if (/^[679]\d{8}$/.test(cleaned)) return null
  
  // +34 prefix with 9 digits
  if (/^\+34[679]\d{8}$/.test(cleaned)) return null
  
  // 0034 prefix variant
  if (/^0034[679]\d{8}$/.test(cleaned)) return null
  
  // 34 prefix without +
  if (/^34[679]\d{8}$/.test(cleaned)) return null
  
  return 'Formato de teléfono no válido (ej: 600123456)'
}
```

---

## 8. Test Strategy

### 8.1 Unit Tests (Vitest)

| Test File | What It Tests |
|-----------|---------------|
| `test/unit/components/ReservationForm.test.ts` | **MODIFY:** Update phone validation tests for Spanish format, add apellidos field test |
| `test/unit/components/ConfiguracionForm.test.ts` | **MODIFY:** Test 8-section layout, SMTP password masking (placeholder dots), GDPR textarea, modo_reserva radio |
| `test/unit/components/GdprConsentModal.test.ts` | **NEW:** Render text, scroll-end detection enables button, reject emits, accept emits |
| `test/unit/components/ClientesTable.test.ts` | **NEW:** Renders list, search filters, expand/collapse reservation history |
| `test/unit/components/ClienteForm.test.ts` | **NEW:** Create mode (telefono editable), Edit mode (telefono read-only), validation |
| `test/unit/pages/reservas.test.ts` | **MODIFY:** Add GDPR step test, update confirmation to show estado |
| `test/unit/pages/cocina/configuracion.test.ts` | **MODIFY:** Test API-based loading (mock $fetch), section rendering |
| `test/unit/pages/cocina/clientes.test.ts` | **NEW:** Page mounts, middleware protection, API calls |
| `test/unit/api/reservas.post.test.ts` | **NEW:** Test handler: validation, client dedup, modo_reserva branching, email trigger |
| `test/unit/api/config.test.ts` | **NEW:** Test handlers: GET excludes password, POST preserves empty password, POST updates real password |
| `test/unit/api/cocina/clientes.test.ts` | **NEW:** Test CRUD handlers, search, reservation history |
| `test/unit/api/cocina/reservas-confirmar.test.ts` | **NEW:** Test confirm flow, estado transition, email trigger |
| `test/unit/api/cocina/smtp-test.test.ts` | **NEW:** Test SMTP test endpoint with valid/invalid config |
| `test/unit/utils/phone.test.ts` | **NEW:** Test normalizePhone() with all Spanish formats and edge cases |
| `test/unit/utils/email.test.ts` | **NEW:** Test port-based TLS selection, HTML template, getEmailConfig priority chain |
| `test/unit/middleware/permissions.test.ts` | **MODIFY:** Add test for `/cocina/clientes` → 'clientes' permission check |

### 8.2 Integration / E2E Tests (Playwright)

[Playwright tests are out of scope for this PR — no changes to e2e specs needed until the full flow can be tested against a staging environment with real SMTP.]

### 8.3 Handler Test Pattern

Following the existing `test/unit/api/cocina/usuarios/handlers.test.ts` pattern:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { handleCreateReservation } from '~/server/api/reservas.post'

describe('handleCreateReservation', () => {
  const mockSupabase = createMockSupabaseClient()  // existing mock pattern
  
  it('validates required fields', async () => {
    const result = await handleCreateReservation(mockSupabase, {} as any)
    expect(result.status).toBe(400)
    expect(result.body.errors).toBeDefined()
  })
  
  it('requires sms_verified flag', async () => {
    const result = await handleCreateReservation(mockSupabase, {
      nombre: 'Test', telefono: '600000000', email: 'a@b.com',
      fecha_hora: futureISO, numero_comensales: 2,
    })
    expect(result.status).toBe(403)
  })
  
  // ... more tests
})
```

---

## 9. Migration Strategy

### 9.1 Data Migration — reservas to clientes

**Current state:** `reservas` table has 0 rows (confirmed via `supabase_list_tables`). If there were data, the migration SQL in section 4.1 handles it:

1. INSERT DISTINCT ON phone → `clientes` (skip if phone already exists)
2. UPDATE `reservas` SET `cliente_id` = `clientes.id` WHERE phone matches
3. DROP old columns (`nombre_cliente`, `telefono`, `email`)

Since there are 0 rows, steps 5-6 in the migration are effectively no-op but safe.

### 9.2 configuracion Row

**Current state:** 1 existing row. Migration adds 7 new columns — all nullable except `modo_reserva` which defaults to `'automatica'`. The existing row will get `modo_reserva='automatica'` automatically via the DEFAULT.

### 9.3 Profiles Permission Migration

SQL to update existing editor profiles to include `"clientes": false`. This is a non-breaking additive change.

### 9.4 Deployment Order

1. Run database migration (sections 4.1, 4.2, 4.4)
2. Run `can_write` function update (section 4.3) if needed
3. Verify RLS policies via `supabase_get_advisors type=security`
4. Deploy application code
5. Regenerate TypeScript types (`supabase_generate_typescript_types`)
6. Re-apply CHECK-constraint literal unions to `database.types.ts`

---

## 10. File Manifest

### New Files

```
server/
  api/
    config.get.ts                     # GET /api/config
    config.post.ts                    # POST /api/config
    cocina/
      clientes/
        list.get.ts                   # GET /api/cocina/clientes
        create.post.ts                # POST /api/cocina/clientes
        [id]/
          update.put.ts               # PUT /api/cocina/clientes/[id]
          reservas.get.ts             # GET /api/cocina/clientes/[id]/reservas
      reservas/
        confirmar.post.ts             # POST /api/cocina/reservas/confirmar
      smtp/
        test.post.ts                  # POST /api/cocina/smtp/test
  utils/
    email.ts                          # SMTP sending + HTML template
    phone.ts                          # Phone normalization

app/
  pages/
    cocina/
      clientes.vue                    # Admin clientes page
  components/
    GdprConsentModal.vue              # GDPR scrollable popup
    ClientesTable.vue                 # Admin clientes table
    ClienteForm.vue                   # Admin cliente form

test/
  unit/
    components/
      GdprConsentModal.test.ts
      ClientesTable.test.ts
      ClienteForm.test.ts
    pages/
      cocina/
        clientes.test.ts
    api/
      reservas.post.test.ts
      config.test.ts
      cocina/
        clientes.test.ts
        reservas-confirmar.test.ts
        smtp-test.test.ts
    utils/
      phone.test.ts
      email.test.ts
```

### Modified Files

```
server/api/reservas.post.ts           # Rewrite: real Supabase
app/pages/reservas.vue                # +GDPR step, +apellidos, +estado
app/components/ReservationForm.vue    # Phone validation, +apellidos
app/components/ConfiguracionForm.vue  # Section layout, SMTP/GDPR/reservas fields
app/pages/cocina/configuracion.vue    # API-based load/save
app/components/AdminSidebar.vue       # +Clientes nav item
app/middleware/permissions.ts         # /cocina/clientes → clientes
nuxt.config.ts                        # +smtpPassword runtimeConfig
app/types/database.types.ts           # Regenerated + manual overlays
package.json                          # +nodemailer, +@types/nodemailer
pnpm-lock.yaml                        # Updated lockfile
test/unit/components/ReservationForm.test.ts
test/unit/components/ConfiguracionForm.test.ts
test/unit/pages/reservas.test.ts
test/unit/pages/cocina/configuracion.test.ts
test/unit/middleware/permissions.test.ts
```

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `can_write()` function doesn't support `'clientes'` key | Editor cannot access clientes page, RLS blocks reads | Verify function in migration; add fallback `COALESCE` in SQL |
| Nodemailer SMTP connection hangs on invalid config | Reservation POST times out | Fire-and-forget pattern — email runs in background, never blocks reservation save |
| Phone normalization edge case — non-Spanish number | Duplicate clients or lookup failure | Fall back to raw cleaned string for non-Spanish patterns; UNIQUE constraint catches duplicates |
| Config API migration — existing page tests break | Test suite failures | Update tests to mock `$fetch('/api/config')` instead of `useSupabaseClient()` |
| Database types regeneration — CHECK unions lost | TypeScript errors on narrowed types | Explicit post-generation step to re-apply manual overlay unions |
| GDPR text NULL → skip step inconsistent with user expectation | Users might expect GDPR step and it doesn't appear | Acceptable: spec explicitly says skip when NULL |
| Migration on reservas with 0 rows is safe but columns drops run | No data loss possible | Confirmed via `supabase_list_tables`: 0 rows in reservas |

---

## Appendix A: TypeScript Interfaces

### A.1 ReservationFlow contract

```typescript
// shared/contracts/reservation.contract.ts
export interface ReservationRequest {
  nombre: string
  apellidos?: string
  telefono: string
  email: string
  fecha_hora: string
  numero_comensales: number
  sms_verified?: boolean
}

export interface ReservationResponse {
  success: boolean
  reserva_id: string
  estado: 'confirmada' | 'pendiente'
}

export interface CreateClientePayload {
  nombre: string
  apellidos?: string
  telefono: string
  email?: string
}

export interface ClienteWithReservas extends CreateClientePayload {
  id: string
  created_at: string
  reservas_count: number
}

export interface ConfiguracionSafe {
  // All config fields EXCEPT smtp_password
  id?: string
  cliente_elige_mesa: boolean | null
  capacidad_total_local: number | null
  modo_ocupacion: 'auto' | 'manual'
  ocupacion_manual: number
  precio_menu_diario: number | null
  precio_menu_sabado: number | null
  mostrar_recomendados: boolean | null
  titulo_recomendados: string | null
  auto_comprimir_imagen: boolean
  max_ancho_imagen: number
  calidad_imagen: number
  max_peso_imagen: number
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_from_email: string | null
  texto_proteccion_datos: string | null
  modo_reserva: 'automatica' | 'verificada'
}
```

---

## Appendix B: Tailwind v4 Migration Note

The project uses Tailwind v4 (`@tailwindcss/vite`). All new components use Tailwind utility classes — no custom CSS. The `GdprConsentModal` uses standard Tailwind overlay/modal patterns with `overflow-y-auto` for scroll detection.
