# Design: Public Pages Design — La Zíngara

## Technical Approach

Six SSR public pages rendered via Nuxt 4 file-based routing at `app/pages/`. All UI components live flat under `app/components/` (no domain slices exist yet — AR-001). Mock data from `shared/fixtures/`. SMS module: DI factory (`server/utils/sms-factory.ts`) resolves provider from `SMS_PROVIDER` env var → adapters in `server/sms/` → Nitro endpoints at `server/api/sms/`. Design tokens via Tailwind v4 `@theme` CSS-first. Fonts: `@nuxt/fonts` primary, Google Fonts `@import` fallback. Images: native `loading="lazy"` (no `@nuxt/image`; placeholders only). Scroll-spy: `process.client` guard (NOT `<ClientOnly>` — component shape identical SSR/client; observer attaches on `onMounted`).

## Architecture Decisions

| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | **Font loading** | `@nuxt/fonts` v0.14.0 with Google Fonts `@import` fallback | Google Fonts only; `@fontsource`; self-hosted | `@nuxt/fonts` provides zero-config Google Fonts with CSS optimization; fallback def `@import` in `main.css` if module fails at install |
| 2 | **Scroll-spy SSR** | `process.client` guard + `onMounted` | `<ClientOnly>` wrap; `onBeforeMount` | Component shape identical SSR/client — no hydration mismatch. `IntersectionObserver` only attaches post-mount. Debounce 300ms per CN-002 edge case |
| 3 | **SMS provider DI** | Factory function `server/utils/sms-factory.ts` resolving `SMS_PROVIDER` from `useRuntimeConfig()` | Direct `process.env`; Nitro plugin; class-based DI container | Lightweight, testable, no extra deps. `useRuntimeConfig()` ensures server-only access. Factory returns singleton per request context |
| 4 | **Component structure** | Flat `app/components/` | `app/features/{domain}/components/` (slice per AR-001) | No domain slices exist yet. AR-001 says slices only for domain logic — public UI pages are shell-level composition surfaces. Flat auto-import works out of the box |
| 5 | **Image loading** | Native `loading="lazy"` + CSS placeholder gradient | `@nuxt/image` v2.0.0 module | `@nuxt/image@2.0.0` depends on `@nuxt/kit@^4.2.0` — compatible but adds module registration risk. All images are placeholders; native lazyload sufficient. Register module but use `<img>` tags |
| 6 | **Tailwind theme** | CSS-first `@theme` block in `main.css` | `tailwind.config.js`; `@layer base` custom properties | Tailwind v4 standard. `@theme { --color-terracotta: #C67B5C; --color-cream: #FAF7F2; --color-slate: #2D3748 }` — utilities auto-generated |
| 7 | **SMS code storage** | In-memory `Map<string, {code, expiresAt}>` in `server/sms/mock.ts` | Redis; Supabase; cookie-based | Phase 1 mock — no persistence needed. 10-min expiry. Resets on server restart (acceptable per SM-005 spec edge case) |

## Version Pin Table

| Package | Pinned | Latest | Peer Compat | Fallback |
|---------|--------|--------|-------------|----------|
| `@nuxt/image` | `^2.0.0` | 2.0.0 | `@nuxt/kit@^4.2.0` ✓ (Nuxt 4.4.8 satisfies) | Native `<img loading="lazy">` |
| `@nuxt/fonts` | `^0.14.0` | 0.14.0 | `@nuxt/kit@^4.2.2` ✓ | Google Fonts `@import` in `main.css` |

No other new deps. All existing deps (tailwindcss, vitest, etc.) pinned in Change #1.

## `nuxt.config.ts` Delta

```ts
// Add modules:
modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/fonts'],

// Add runtimeConfig:
runtimeConfig: {
  labsMobileUsername: '',   // LABSMOBILE_USERNAME (server-only)
  labsMobileToken: '',      // LABSMOBILE_TOKEN (server-only)
  labsMobileSender: 'LaZingara',
  labsMobileTest: '1',
  smsProvider: 'mock',      // SMS_PROVIDER (server-only)
  public: {
    siteUrl: 'https://www.lazingara.es',  // NUXT_PUBLIC_SITE_URL
  },
},
```

## Folder Tree (files added/modified)

```
app/
├── pages/
│   ├── index.vue              [MODIFY — rewrite as home hero + 5 cards]
│   ├── carta.vue              [CREATE — composition surface]
│   ├── menu-diario.vue         [CREATE]
│   ├── reservas.vue            [CREATE]
│   ├── eventos.vue             [CREATE]
│   └── contacto.vue            [CREATE]
├── components/
│   ├── AppHeader.vue           [CREATE]
│   ├── AppFooter.vue           [CREATE]
│   ├── BaseButton.vue          [CREATE]
│   ├── BaseCard.vue            [CREATE]
│   ├── PageHero.vue            [CREATE]
│   ├── SectionDivider.vue      [CREATE]
│   ├── CategorySelector.vue    [CREATE]
│   ├── ProductGrid.vue         [CREATE]
│   ├── ProductCard.vue         [CREATE]
│   ├── SmsVerificationStep.vue [CREATE]
│   ├── ReservationForm.vue     [CREATE]
│   ├── EventCard.vue           [CREATE]
│   ├── ContactForm.vue         [CREATE]
│   └── MapEmbed.vue            [CREATE]
├── layouts/default.vue         [MODIFY — wrap with AppHeader/AppFooter]
└── assets/css/main.css         [MODIFY — add @theme + font imports]
shared/
├── contracts/
│   └── sms.contract.ts         [CREATE]
└── fixtures/
    ├── carta-mock.ts           [EXISTS — enrich with descripcion, imagen_url, alergenos]
    ├── menu-diario-mock.ts     [CREATE]
    └── eventos-mock.ts         [CREATE]
server/
├── sms/
│   ├── mock.ts                 [CREATE]
│   └── labsmobile.ts           [CREATE]
├── utils/
│   └── sms-factory.ts          [CREATE]
└── api/
    ├── sms/
    │   ├── send.post.ts        [CREATE]
    │   └── verify.post.ts      [CREATE]
    ├── reservas.post.ts        [CREATE]
    └── contacto.post.ts        [CREATE]
test/
├── unit/
│   └── components/             [CREATE — per-component spec tests]
├── nuxt/
│   ├── public-pages.test.ts    [CREATE — SSR $fetch 200 for all 6 pages]
│   └── sms-endpoints.test.ts   [CREATE — send/verify integration]
└── e2e/
    └── smoke-navigation.spec.ts [CREATE — home → carta → reservas SMS flow]
nuxt.config.ts                  [MODIFY — add modules + runtimeConfig]
```

## Component Inventory

| Component | Props | Emits | Slots | Path |
|-----------|-------|-------|-------|------|
| AppHeader | — | — | — | `app/components/AppHeader.vue` |
| AppFooter | — | — | — | `app/components/AppFooter.vue` |
| BaseButton | `variant: 'primary'\|'secondary'\|'ghost'`, `size: 'sm'\|'md'\|'lg'`, `disabled: boolean` | `click` | `default` | `app/components/BaseButton.vue` |
| BaseCard | `image?: string`, `imageAlt?: string` | — | `default` | `app/components/BaseCard.vue` |
| PageHero | `title: string`, `subtitle?: string`, `background?: string` | — | — | `app/components/PageHero.vue` |
| SectionDivider | `label?: string` | — | — | `app/components/SectionDivider.vue` |
| CategorySelector | `categories: string[]`, `modelValue: string` | `update:modelValue` | — | `app/components/CategorySelector.vue` |
| ProductGrid | `categories: MockCategoria[]` | — | — | `app/components/ProductGrid.vue` |
| ProductCard | `plato: MockPlato` | — | — | `app/components/ProductCard.vue` |
| SmsVerificationStep | `phone: string` | `verified`, `back` | — | `app/components/SmsVerificationStep.vue` |
| ReservationForm | — | `submit: ReservationPayload` | — | `app/components/ReservationForm.vue` |
| EventCard | `evento: MockEvento` | — | — | `app/components/EventCard.vue` |
| ContactForm | — | `submit: ContactPayload` | — | `app/components/ContactForm.vue` |
| MapEmbed | `src: string`, `title: string` | — | — | `app/components/MapEmbed.vue` |

## SMS Module Architecture

```
shared/contracts/sms.contract.ts   ← SmsProvider interface
        │
        ▼
server/utils/sms-factory.ts        ← DI: reads SMS_PROVIDER → returns SmsProvider
        │
        ├──▶ server/sms/mock.ts          ← MockSmsProvider (code "1234", console.log)
        └──▶ server/sms/labsmobile.ts    ← LabsMobileProvider (POST api.labsmobile.com)
                │
                ▼
server/api/sms/send.post.ts        ← POST { phone } → { success, code? }
server/api/sms/verify.post.ts      ← POST { phone, code } → { valid }
        │
        ▼
app/components/SmsVerificationStep.vue  ← UI: code input, retry, resend cooldown
```

## SMS Verification Sequence Diagram

```
User                SmsVerificationStep         /api/sms/send         /api/sms/verify      SmsProvider
 │                         │                         │                     │                   │
 │─ enter phone + valid ──▶│                         │                     │                   │
 │                         │─ POST {phone} ────────▶│                     │                   │
 │                         │                         │─ sendCode(phone) ───────────────────▶│
 │                         │                         │◀── {success, code} ────────────────│
 │                         │◀── {success, code} ────│ (mock: "1234")      │                   │
 │                         │ (logs to console)       │                     │                   │
 │─ enter "1234" ────────▶│                         │                     │                   │
 │                         │─ POST {phone, code} ───────────────────────▶│                   │
 │                         │                         │                     │─ verifyCode() ──▶│
 │                         │                         │                     │◀── true ───────│
 │                         │◀── {valid: true} ──────────────────────────│                     │
 │◀── emit("verified") ──│                         │                     │                   │
 │ (form enabled)          │                         │                     │                   │
```

## Mock Data Fixtures

**`shared/fixtures/menu-diario-mock.ts`** types:
```ts
export interface MenuDiarioDia {
  dia: number       // 0=Sun..6=Sat
  precio: string    // "18"
  secciones: { nombre: string; platos: { nombre: string; descripcion?: string }[] }[]
}
export const mockMenuDiario: MenuDiarioDia[]
```

**`shared/fixtures/eventos-mock.ts`** types:
```ts
export interface MockEvento {
  id: string; fecha: string; titulo: string; descripcion: string
  imagen_url?: string; categoria: 'festivo' | 'espectaculo'; soldOut?: boolean
}
export const mockEventos: MockEvento[]
```

**`shared/fixtures/carta-mock.ts`** — enrich existing `MockPlato` entries with `descripcion`, `imagen_url`, `alergenos`, `calorias` (already typed; values to be filled).

## Testing Strategy

| Layer | What | Tool | Files |
|-------|------|------|-------|
| Unit | CategorySelector scroll logic (CN-001/002), ProductCard rendering (CN-004), SMS verification UI (RF-003), ReservationForm validation (RF-001), BaseButton variants (PU-005), AppHeader mobile toggle (PU-003) | Vitest + `@vue/test-utils` + happy-dom | `test/unit/components/*.test.ts` |
| Integration | All 6 pages render HTML 200 + Spanish content (NX-005, PU-001–008), SMS send/verify endpoints (SM-005), contact/reservas mock endpoints (RF-005, CO-004) | Vitest + `@nuxt/test-utils` `$fetch` | `test/nuxt/public-pages.test.ts`, `test/nuxt/sms-endpoints.test.ts` |
| E2E | Smoke: home → carta (scroll-spy activates) → menu-diario → reservas (SMS flow) → eventos → contacto | Playwright | `test/e2e/smoke-navigation.spec.ts` |

## Line Count Forecast

~2,200 lines across ~42 files. Risk: **High** (>400-line budget). Flag as `size:exception` in sdd-tasks. Recommend chained PRs: (1) design tokens + shared components, (2) pages + layout, (3) SMS module + endpoints, (4) tests.

## Migration / Rollout

No migration. Mock-only. Revert commit.

## Open Questions

- [ ] `@nuxt/fonts@0.14.0` 0.x stability — verify at install; fallback documented
- [ ] `@nuxt/image@2.0.0` module registration interaction with Tailwind v4 Vite plugin — verify at install
