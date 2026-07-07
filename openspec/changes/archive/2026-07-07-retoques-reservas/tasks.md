# Tasks: retoques-reservas

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1500–1800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Server) → PR 3 (UI) |
| Delivery strategy | ask-on-risk → **size:exception granted** (approved by maintainer) |
| Chain strategy | single PR |

Decision needed before apply: Yes — resolved: **size:exception**
Chained PRs recommended: Yes — overridden: **single PR with exception**
400-line budget risk: High — accepted

### Suggested Work Units

| Unit | Goal | PR | Base | Notes |
|------|------|-----|------|-------|
| 1 | DB migration, deps, types | PR 1 | main | SQL only, auto-tested via migration apply |
| 2 | Server utils + 9 API endpoints | PR 2 | PR 1 | Core logic, handler-pattern + unit tests |
| 3 | Components, pages, wiring + tests | PR 3 | PR 2 | Vue components + page integration + unit tests |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Apply DB migration: create `clientes` table (id, nombre, apellidos, telefono UNIQUE, email, timestamps), add 7 columns to `configuracion` (smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_password, texto_proteccion_datos, modo_reserva DEFAULT 'automatica'), add `cliente_id` FK to `reservas` + index. Enable RLS on clientes (admin_all + editor_read). `can_write()` is dynamic — no function change needed. Set default permissions `{"clientes": false}` for editor profiles.
- [x] 1.2 Install nodemailer + @types/nodemailer (`pnpm add`). Add `smtpPassword` to `nuxt.config.ts` runtimeConfig. Create `shared/contracts/reservation.contract.ts` (ReservationRequest, ReservationResponse, ClienteData, ClienteWithCount, ConfigData, ConfigUpdatePayload, etc.).
- [x] 1.3 Regenerate `database.types.ts` via Supabase MCP. Re-apply CHECK constraint manual overlays (literal union types) including new `modo_reserva` → `'automatica' | 'verificada'`. Run `supabase_get_advisors type=security` — no new issues.

## Phase 2: Server Logic (PR 2)

- [x] 2.1 Create `server/utils/phone.ts` (normalizePhone → E.164: strip formatting, handle +34/34 prefixes, starts 6/7/9) + `server/utils/email.ts` (getEmailConfig from DB + NUXT_SMTP_PASSWORD env override, sendEmail with port-based TLS: 465→SSL, 587→STARTTLS, buildConfirmationHtml template). TDD: `phone.test.ts` (17 tests), `email.test.ts` (10 tests).
- [x] 2.2 Create GET/POST `/api/config`: GET excludes smtp_password via destructure; POST upserts config, preserves password when empty or "••••••••". TDD: `config.test.ts` (7 tests: password redaction, write-only).
- [x] 2.3 Rewrite POST `/api/reservas`: validate required fields, SMS gate (sms_verified flag), normalize phone → upsert cliente BY phone, create reserva with modo_reserva branching (automatica→confirmada+email, verificada→pendiente). TDD: `reservas.post.test.ts` (7 tests).
- [x] 2.4 Create CRUD `/api/cocina/clientes` (list/search with reservas_count, create, update [id], reservas/[id] history). Follow existing handler pattern from `server/api/cocina/usuarios/handlers.ts`. TDD: handler tests (9 tests).
- [x] 2.5 Create POST `/api/cocina/reservas/confirmar` (estado→confirmada, idempotent guard, fire-and-forget email) + POST `/api/cocina/smtp/test` (reads DB config, sends test email). Implemented, tested via integration.

## Phase 3: UI Integration (PR 3)

- [x] 3.1 Create `GdprConsentModal.vue`: scrollable overlay with texto_proteccion_datos, scroll-end detection enables "Aceptar" button, "Rechazar" returns to form preserving data. TDD: component test (9 tests: render text, scroll-end enable, reject emit, accept emit).
- [x] 3.2 Create `ClientesTable.vue` (search, list with reservas_count, expand/collapse reservation history via GET /api/cocina/clientes/[id]/reservas) + `ClienteForm.vue` (create/edit modes, telefono read-only on edit, phone validation). Implemented.
- [x] 3.3 Rework `ConfiguracionForm.vue`: 8-section layout (General, Elección mesa, Precios, Recomendados, Imágenes, Correo saliente, Protección datos, Reservas), new SMTP/GDPR/Reservas fields, SMTP test button, password masking placeholder. Refactor `cocina/configuracion.vue`: replace `useSupabaseClient` → `$fetch('/api/config')` for load/save.
- [x] 3.4 Update `ReservationForm.vue`: replace E.164 regex with Spanish phone validation (9 digits, starts 6/7/9, optional +34/34 prefix), add `apellidos` field. Update `reservas.vue`: insert GDPR step between form and SMS (skip if texto_proteccion_datos is null), show `estado` in confirmation from real API response.
- [x] 3.5 Add `Clientes` nav item to `AdminSidebar.vue` (resource='clientes'), add `/cocina/clientes` → `'clientes'` mapping in `permissions.ts` middleware, create `cocina/clientes.vue` page mounting `ClientesTable` + `ClienteForm`. Update test files: ReservationForm (13 tests), ConfiguracionForm (11 tests), reservas page (6 tests), permissions middleware.
