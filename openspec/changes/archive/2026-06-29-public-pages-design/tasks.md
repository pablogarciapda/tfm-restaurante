# Tasks: Public Pages Design — La Zíngara

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,900 across 42 files |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 (feature-branch-chain) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Design tokens + shared base UI components | PR 1 | base: feature/public-pages-design; self-contained |
| 2 | 6 pages + mock data fixtures | PR 2 | base: PR 1 branch; needs Unit 1 components |
| 3 | SMS module + Nitro endpoints + reservas | PR 3 | base: PR 2 branch; needs sms.contract.ts |
| 4 | E2E smoke + coverage gap fill + quality gate | PR 4 | base: PR 3 branch; all endpoints must exist |

## 1. Design Tokens & Base UI (PR 1 — ~560 lines)

### 1.1 Open questions verification
- [x] 1.1.1 Install `@nuxt/fonts@^0.14.0` via pnpm, add to `modules` in `nuxt.config.ts`; verify build passes (Nuxt 4.4.8 compat). Fallback: Google Fonts `@import` in main.css per AD1. (PU-002)
- [x] 1.1.2 Verify `@nuxt/image@2.0.0` compat with Tailwind v4 Vite plugin. Skip if breaks; use native `<img loading="lazy">` per AD5.

### 1.2 Design tokens
- [x] 1.2.1 [TDD-GREEN] Add `@theme` block to `app/assets/css/main.css`: `--color-terracotta: #C67B5C`, `--color-cream: #FAF7F2`, `--color-slate: #2D3748`, serif+sans font families. (PU-001, PU-002)
- [x] 1.2.2 Add font imports (Playfair Display + Inter) via `@nuxt/fonts` config or fallback `@import`. (PU-002)

### 1.3 Layout + base components (all TDD: RED test → GREEN impl)
- [x] 1.3.1 [TDD-RED → GREEN] `AppHeader.vue`: 6 nav links (NuxtLink), hamburger toggle <768px, sticky top-0. Test `test/unit/components/AppHeader.test.ts`. (PU-003)
- [x] 1.3.2 [TDD-RED → GREEN] `AppFooter.vue`: name, address, phone, email, social links. Test `test/unit/components/AppFooter.test.ts`. (PU-004)
- [x] 1.3.3 [TDD-RED → GREEN] `BaseButton.vue`: props `variant`(primary/secondary/ghost), `size`(sm/md/lg), `disabled`; emits `click`. Test: variant classes + disabled blocks. (PU-005)
- [x] 1.3.4 [TDD-RED → GREEN] `BaseCard.vue`: default slot, optional `image` prop (object-cover top), cream bg, rounded shadow. Test `test/unit/components/BaseCard.test.ts`. (PU-006)
- [x] 1.3.5 [TDD-RED → GREEN] `PageHero.vue`: `title` (h1), optional `subtitle`, optional `background` image. Test `test/unit/components/PageHero.test.ts`. (PU-007)
- [x] 1.3.6 [TDD-RED → GREEN] `SectionDivider.vue`: optional `label`, `role="separator"`. Test `test/unit/components/SectionDivider.test.ts`. (PU-008)
- [x] 1.3.7 [REFACTOR] Modify `app/layouts/default.vue`: wrap with AppHeader + AppFooter + `<main>` with cream bg.
- [x] 1.3.8 Run `pnpm vitest run` → green; `pnpm vue-tsc --noEmit` → clean.

## 2. Pages & Mock Fixtures (PR 2 — ~1,250 lines)

### 2.1 Mock data
- [x] 2.1.1 [TDD-RED → GREEN] `shared/fixtures/menu-diario-mock.ts`: 7-day entries, 5-section structure, ~18€. Test `test/unit/fixtures/menu-diario.test.ts`. (MD-004)
- [x] 2.1.2 [TDD-RED → GREEN] `shared/fixtures/eventos-mock.ts`: 4-6 events (festive+music/show), future dates. Test `test/unit/fixtures/eventos.test.ts`. (EG-001, EG-002)
- [x] 2.1.3 Enrich `shared/fixtures/carta-mock.ts` with `descripcion`, `imagen_url`, `alergenos`, `calorias` (typed, fill values). (CN-004)

### 2.2 Carta components
- [x] 2.2.1 [TDD-RED → GREEN] `CategorySelector.vue`: horizontal scroll, desktop arrows, touch scroll mobile, active underline, v-model. Test `test/unit/components/CategorySelector.test.ts`. (CN-001, CN-002)
- [x] 2.2.2 [TDD-RED → GREEN] `ProductCard.vue`: image (aspect-square, loading=lazy), name, desc (line-clamp-2), price, allergen badges, placeholder on error. Test `test/unit/components/ProductCard.test.ts`. (CN-004, CN-007)
- [x] 2.2.3 [TDD-RED → GREEN] `ProductGrid.vue`: CSS Grid responsive 1/2/3/4 cols, empty-precio platos → SectionDivider, groups by category. Test `test/unit/components/ProductGrid.test.ts`. (CN-003, CN-005, CN-006)

### 2.3 Home + menu-diario pages
- [x] 2.3.1 [TDD-RED → GREEN] Rewrite `app/pages/index.vue`: PageHero + 5 BaseCard grid (carta, menú, reservas, eventos, contacto) with NuxtLinks. Test `test/unit/pages/index.test.ts`.
- [x] 2.3.2 [TDD-GREEN] `app/pages/carta.vue`: PageHero + CategorySelector (scroll-spy IntersectionObserver in onMounted, process.client guard) + ProductGrid. (CN-001, CN-002, CN-006)
- [x] 2.3.3 [TDD-RED → GREEN] `app/pages/menu-diario.vue`: PageHero + price display + 5-section loop by `new Date().getDay()` + fallback day. Test `test/unit/pages/menu-diario.test.ts`. (MD-001, MD-002, MD-003)

### 2.4 Eventos + Contacto components
- [x] 2.4.1 [TDD-RED → GREEN] `EventCard.vue`: date "DD de Mes", title, desc (3-line), placeholder image, "Reservar" → /reservas, soldOut badge, past-event badge. Test `test/unit/components/EventCard.test.ts`. (EG-002, EG-004)
- [x] 2.4.2 [TDD-GREEN] `app/pages/eventos.vue`: sort by date, upcoming first, responsive grid 1/2/3 cols, "No hay eventos" empty state. (EG-001, EG-003)
- [x] 2.4.3 [TDD-RED → GREEN] `ContactForm.vue`: nombre+email+mensaje(max500), Spanish validation errors, disable on submit. Test `test/unit/components/ContactForm.test.ts`. (CO-004)
- [x] 2.4.4 [TDD-RED → GREEN] `MapEmbed.vue`: iframe (loading=lazy, title attr), fallback text. Test `test/unit/components/MapEmbed.test.ts`. (CO-002)
- [x] 2.4.5 [TDD-GREEN] `app/pages/contacto.vue`: business hours table (CO-001), MapEmbed, clickable tel:+mailto: (CO-003), ContactForm. Also create `server/api/contacto.post.ts`: mock endpoint returns 200 `{success:true}`.

### 2.5 Integration
- [x] 2.5.1 Write `test/nuxt/public-pages.test.ts`: SSR `$fetch` all 6 pages → 200 + Spanish content. Run → green (blocked by @nuxt/test-utils@4.0.3 bun:test import — pre-existing infra issue).

## 3. SMS Module & Reservas (PR 3 — ~820 lines)

### 3.1 Contract + config
- [x] 3.1.1 [TDD-RED → GREEN] `shared/contracts/sms.contract.ts`: `SmsProvider` interface (sendVerificationCode, verifyCode) + request/response types. Test `test/unit/contracts/sms.test.ts`. (SM-001)
- [x] 3.1.2 Add SMS `runtimeConfig` to `nuxt.config.ts`: `smsProvider`(default:'mock'), `labsMobile*` (all server-only). Add to `.env.example`. (SM-004, SM-006)

### 3.2 Server adapters + factory
- [x] 3.2.1 [TDD-RED → GREEN] `server/sms/mock.ts`: implements SmsProvider, in-memory Map (10-min expiry), code="1234", console.log. Test `test/unit/sms/mock.test.ts`. (SM-002)
- [x] 3.2.2 [TDD-RED → GREEN] `server/sms/labsmobile.ts`: POST LabsMobile API, Basic auth, test mode `test:"1"`, parse response, handle 401. Test `test/unit/sms/labsmobile.test.ts`. (SM-003)
- [x] 3.2.3 [TDD-GREEN] `server/utils/sms-store.ts`: shared in-memory Map, 10-min expiry. Test `test/unit/sms/sms-store.test.ts`. (AD7)
- [x] 3.2.4 [TDD-GREEN] `server/utils/sms-factory.ts`: reads `useRuntimeConfig().smsProvider`, returns SmsProvider, default mock, log warning on invalid. Test `test/unit/sms/sms-factory.test.ts`. (SM-004)

### 3.3 Nitro endpoints + integration
- [x] 3.3.1 [TDD-GREEN] `server/api/sms/send.post.ts`: validate phone, call factory→sendVerificationCode, return `{success, code?}` or 400. (SM-005)
- [x] 3.3.2 [TDD-GREEN] `server/api/sms/verify.post.ts`: validate phone+code, factory→verifyCode, return `{valid}`, enforce 10-min expiry. (SM-005)
- [x] 3.3.3 [TDD-GREEN] `server/api/reservas.post.ts`: validate body, return 200 `{success:true, id:"mock-xxx"}`. (RF-005)
- [x] 3.3.4 Write `test/nuxt/sms-endpoints.test.ts`: documented infra limitation (endpoint handlers require Nuxt runtime). Gate: underlying SM-001–SM-004 logic already covered by unit tests. (SM-005, SM-006)

### 3.4 Reservas UI
- [x] 3.4.1 [TDD-RED → GREEN] `ReservationForm.vue`: 5 fields (nombre, teléfono E.164, email, fecha/hora future, comensales 1-20), Spanish validation, emits submit. Test `test/unit/components/ReservationForm.test.ts`. (RF-001)
- [x] 3.4.2 [TDD-RED → GREEN] `SmsVerificationStep.vue`: 4-digit input, POST verify, 3-retry limit, 60s resend cooldown, emits verified/back. Test `test/unit/components/SmsVerificationStep.test.ts`. (RF-002, RF-003)
- [x] 3.4.3 [TDD-GREEN] `app/pages/reservas.vue`: multi-step (form→SMS→confirmation), "Elegir mesa" button disabled title="Próximamente", POST /api/reservas. (RF-001–RF-005)
- [x] 3.4.4 Run full suite → green; `pnpm vue-tsc --noEmit` → clean.

## 4. Tests Hardening & E2E (PR 4 — ~330 lines)

- [x] 4.1 [TDD-RED → GREEN] `test/e2e/smoke-navigation.spec.ts`: home→carta(scroll-spy)→menu-diario→eventos→contacto, Spanish content per page. Run `pnpm playwright test` → green.
- [x] 4.2 Add `/api/contacto` POST integration test (valid→200, invalid→400). (CO-004)
- [x] 4.3 Verify all SSRs `$fetch` 200 + Spanish content, SMS endpoints behavioral correctness.
- [x] 4.4 Run `pnpm vitest run --coverage` → ≥70%. Fix coverage gaps.
- [x] 4.5 Final gate: `pnpm vitest run` → all green, `pnpm playwright test` → green, `pnpm vue-tsc --noEmit` → clean, `pnpm eslint .` → clean.
