# SMS Provider Guide — Creación de Nuevos Proveedores

> ⚠️ **Importante**: La guía de creación de providers (secciones 1-3) ya refleja
> el código actual. La sección 4 es un **análisis/plan** para una evolución futura
> (guardar configuración en DB), NO el estado actual del código.

---

> **Principio**: El sistema SMS está desacoplado mediante el contrato `SmsProvider`
> (`shared/contracts/sms.contract.ts`). Añadir un nuevo proveedor NO requiere
> cambiar endpoints, frontend, lógica de verificación, ni flujo de reservas.

---

## 1. Contrato `SmsProvider`

Todo proveedor debe implementar esta interfaz:

```ts
interface SmsProvider {
  sendVerificationCode(phone: string): Promise<SmsSendResponse>
  verifyCode(phone: string, code: string): Promise<SmsVerifyResponse>
  sendNotification(phone: string, message: string): Promise<SmsSendResponse>
}
```

| Método | Propósito | Almacena código? |
|--------|-----------|-----------------|
| `sendVerificationCode` | Genera código, lo envía por SMS, lo guarda en `sms-store` | Sí (llama a `storeCode`) |
| `verifyCode` | Verifica código contra `sms-store` | No (solo lectura + delete en éxito) |
| `sendNotification` | Envía SMS libre (confirmación, etc.) | No (fire-and-forget) |

**Reglas de negocio**:
- `sendVerificationCode` NUNCA debe exponer el código en la respuesta (solo `MockSmsProvider` lo hace para testing)
- `verifyCode` delega en `sms-store` (servicio compartido en `server/utils/sms-store.ts`)
- Los códigos son **one-time use**: se borran tras verify exitoso
- TTL por defecto: 10 minutos

---

## 2. Guía paso a paso: LabsMobile → Twilio (ejemplo)

### 2.1 Crear el adapter

```
server/sms/twilio.ts
```

```ts
import type {
  SmsProvider,
  SmsSendResponse,
  SmsVerifyResponse,
} from '#shared/contracts/sms.contract'
import { storeCode, getCode, deleteCode } from '../utils/sms-store'

export interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
}

export class TwilioProvider implements SmsProvider {
  private config: TwilioConfig

  constructor(config: TwilioConfig) {
    this.config = config
  }

  private generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000))
  }

  async sendVerificationCode(phone: string): Promise<SmsSendResponse> {
    const code = this.generateCode()

    try {
      // Llamada a API de Twilio (usando fetch directamente o SDK)
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: this.config.fromNumber,
            Body: `Tu codigo de verificacion es ${code}`,
          }),
        },
      )

      if (!response.ok) {
        return { success: false, error: `Twilio error: ${response.status}` }
      }

      storeCode(phone, code)
      return { success: true }
    } catch (err) {
      console.error('[Twilio] sendVerificationCode failed:', err)
      return { success: false, error: 'SMS service unavailable' }
    }
  }

  async verifyCode(phone: string, code: string): Promise<SmsVerifyResponse> {
    const entry = getCode(phone)
    if (!entry) return { valid: false, error: 'No verification code found or expired' }
    if (entry.code !== code) return { valid: false, error: 'Code mismatch' }
    deleteCode(phone)
    return { valid: true }
  }

  async sendNotification(phone: string, message: string): Promise<SmsSendResponse> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: this.config.fromNumber,
            Body: message,
          }),
        },
      )

      if (!response.ok) {
        return { success: false, error: `Twilio error: ${response.status}` }
      }

      return { success: true }
    } catch (err) {
      console.error('[Twilio] sendNotification failed:', err)
      return { success: false, error: 'SMS service unavailable' }
    }
  }
}
```

**Nota**: `verifyCode` es IDÉNTICA para todos los proveedores porque la verificación
es siempre local contra `sms-store`. Solo cambia el envío del código.

### 2.2 Registrar el adapter en la factoría

```ts
// server/utils/sms-factory.ts
import { TwilioProvider, type TwilioConfig } from '../sms/twilio'

// Añadir a resolveRuntimeConfig:
const providerName = (config.smsProvider as string) || 'labsmobile'

// Añadir resolución en getSmsProvider:
if (effectiveName === 'twilio') {
  const mergedConfig = configOverride ?? twilioConfig
  if (!mergedConfig?.accountSid || !mergedConfig?.authToken) {
    // fallback a mock
  }
  return new TwilioProvider(mergedConfig)
}
```

### 2.3 Añadir variables de entorno

```env
# .env — elegir proveedor
NUXT_SMS_PROVIDER=twilio

# Credenciales Twilio (solo si NUXT_SMS_PROVIDER=twilio)
NUXT_TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
NUXT_TWILIO_AUTH_TOKEN=your_auth_token
NUXT_TWILIO_FROM_NUMBER=+1234567890
```

Y registrarlas en `nuxt.config.ts` → `runtimeConfig`:

```ts
runtimeConfig: {
  // ... existente
  smsProvider: 'labsmobile',          // 'mock' | 'labsmobile' | 'twilio'
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
}
```

### 2.4 Lo que NO cambia

- `server/api/sms/send.post.ts` — endpoint
- `server/api/sms/verify.post.ts` — endpoint
- `app/components/SmsVerificationStep.vue` — frontend
- `app/pages/reservas.vue` — flujo de reservas
- `server/api/reservas.handlers.ts` — lógica de reservas
- `server/utils/sms-store.ts` — almacén de códigos
- `shared/contracts/sms.contract.ts` — contrato

---

## 3. Tests

Cada nuevo adapter debe tener su batería de tests:

```
test/unit/sms/twilio.test.ts
```

Siguiendo el patrón de `test/unit/sms/labsmobile.test.ts`:
- Mockear `$fetch` global
- Testear send exitoso (verificar URL, headers, body)
- Testear error 401/403 (credenciales inválidas)
- Testear network error
- Testear verifyCode contra sms-store

Además, actualizar `test/unit/sms/sms-factory.test.ts` para cubrir la
resolución del nuevo provider.

---

## 4. Análisis: ¿Se puede guardar la config del SMS en la DB (`configuracion`)?

### 4.1 Situación actual

Hoy las credenciales SMS vienen de variables de entorno (`NUXT_*`) → `runtimeConfig` → factoría.
Es el modelo **12-factor app**: config en el entorno, no en el código ni en la DB.

### 4.2 ¿Depende del proveedor?

**No**. La pregunta de fondo no es del proveedor, es arquitectónica:

| Aspecto | ¿Varía por proveedor? | Impacto |
|---------|----------------------|---------|
| **Shape de las credenciales** | Sí | LabsMobile: `username+token`. Twilio: `accountSid+authToken+fromNumber` |
| **Necesidad de almacenar secrets** | No | Todos necesitan guardar tokens/API keys de forma segura |
| **Necesidad de rotar credenciales** | No | Todos deberían poder rotarse sin deploy |
| **Lectura en runtime** | No | Todos se leen en cada petición SMS |

El problema es el mismo para todos: **guardar secrets de forma segura y accesible
en runtime**.

### 4.3 Precedente: SMTP password en DB

La tabla `configuracion` ya guarda `smtp_password` con estas reglas:
- **Write-only**: el admin la escribe desde `ConfiguracionForm`, pero GET /api/config
  nunca la expone (llega como `"smtp_password": "••••••••"` o directamente se omite)
- **Lectura server-side**: el handler de email la lee directamente de la DB
- **Persistencia**: sobrevive a restarts, deploys, cambios de VPS

El SMS podría seguir el MISMO patrón.

### 4.4 Propuesta: JSONB `sms_provider_config`

En vez de columnas separadas por proveedor (no escalable), usar una columna JSONB:

```sql
ALTER TABLE configuracion
ADD COLUMN sms_provider_config jsonb DEFAULT '{}'::jsonb;
```

Estructura del JSONB:

```json
{
  "provider": "labsmobile",
  "test_mode": false,
  "credentials": {
    "username": "email@ejemplo.com",
    "token": "api-token-123"
  },
  "sender": "MiRestaurante"
}
```

Para Twilio sería:

```json
{
  "provider": "twilio",
  "test_mode": false,
  "credentials": {
    "accountSid": "ACxxx",
    "authToken": "token",
    "fromNumber": "+1234567890"
  }
}
```

### 4.5 Plan de implementación

#### Fase A — Migración DB (baja, 1 día)

1. Migración SQL: añadir columna `sms_provider_config JSONB`
2. RLS policy: solo admin puede leer/escribir
3. Seed: migrar valores actuales desde `.env` a la DB (opcional)

```sql
-- shared/db/migrations/003-add-sms-provider-config.sql
ALTER TABLE configuracion
ADD COLUMN sms_provider_config jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN configuracion.sms_provider_config IS
  'SMS provider configuration: { provider, test_mode, credentials, sender }';
```

#### Fase B — Backend (media, 2-3 días)

1. **Nuevo server util** `server/utils/sms-db-config.ts`:
   - Función `getSmsProviderFromDb(supabase)`: lee `configuracion.sms_provider_config`
   - Retorna el provider resuelto (mock si test_mode, LabsMobile/Twilio si no)

2. **Modificar factoría** `server/utils/sms-factory.ts`:
   - Añadir resolución por DB con fallback a runtimeConfig:
     ```
     1. Si hay DB config → usar ese provider
     2. Si no → usar runtimeConfig (env vars) como hoy
     ```
   - La lectura de DB necesita `supabase` client → la factoría necesitará
     recibirlo como parámetro o leerlo en el handler y pasarlo

3. **Modificar endpoints** `server/api/sms/send.post.ts` y `verify.post.ts`:
   - Leer `supabase` del event context
   - Pasarlo a la factoría

4. **API de lectura** (solo admin):
   - `GET /api/cocina/sms-config` → devuelve config SIN credentials
     ```json
     { "provider": "labsmobile", "test_mode": false, "sender": "MiRes",
       "has_credentials": true }
     ```
   - `POST /api/cocina/sms-config` → guarda config completa (credentials incluidas)

5. **Seguridad**:
   - `smtp_password` ya es write-only → aplicar mismo patrón:
     - GET nunca expone `credentials`
     - POST sí recibe credentials y las guarda
     - Campo `has_credentials` boolean para que el frontend sepa si hay

#### Fase C — Frontend (baja-media, 1-2 días)

1. Añadir sección "Proveedor SMS" en `ConfiguracionForm.vue`:
   - Selector: LabsMobile / Twilio / (futuros)
   - Campos dinámicos según proveedor seleccionado
   - Checkbox "Modo test" (mock)
   - Input "Remitente" (sender/tpoa)
   - Inputs de credenciales (write-only: mostrar "••••••••" si ya hay)
   - Botón "Probar conexión" (opcional)

2. Los campos de credenciales deben aparecer/desaparecer según el proveedor

#### Fase D — Limpieza (baja, 0.5 días)

1. Decidir si mantener env vars como fallback o eliminarlas
2. Actualizar `.env.example`
3. Actualizar `ecosystem.config.cjs` (posiblemente simplificar)

### 4.6 Trade-offs y riesgos

| Aspecto | Env vars (hoy) | DB (propuesta) |
|---------|---------------|----------------|
| **Disponibilidad** | Siempre disponible | Depende de DB → si DB cae, no hay SMS |
| **Seguridad** | En disco + RAM del proceso | En DB (protegido por RLS + write-only) |
| **Rotación** | Requiere deploy/restart | Desde admin, en vivo |
| **Multi-tenant** | Cada tenant necesita su .env | Misma DB, distinto row |
| **Complejidad** | Mínima | Media (nueva tabla/columna, API, frontend) |
| **Precedente** | — | SMTP password ya usa este patrón |

**Recomendación**: La DB es viable y el precedente de SMTP lo avala.
Para multi-tenant es claramente superior. El riesgo principal es la dependencia
de DB para el envío de SMS — mitigable con el fallback a env vars.

### 4.7 Árbol de decisión

```
¿Es multi-tenant?
  ├── Sí → DB (cada tenant configura su propio SMS desde admin)
  └── No → ¿Rotas credenciales seguido?
         ├── Sí → DB (cambio desde admin, sin deploy)
         └── No → Env vars (más simple, suficiente)
```

Dado que el proyecto apunta a multi-tenant, la DB es la dirección correcta.
