# Proposal: Public Pages Design — La Zíngara

## Intent

Build the 6 public-facing pages of Restaurante La Zíngara with mock data, a cohesive terracotta-cream-slate editorial design, and a provider-agnostic SMS verification module. Delivers the complete user-facing website — independent of Supabase (Change #3). Phase 1 MVP public front.

## Scope

### In Scope
- `/` — Minimalist home: hero + 5 direct-access cards (carta, menú, reservas, eventos, contacto)
- `/carta` — CategorySelector (scrollable bar, sticky, scroll-spy) + ProductGrid (responsive 1-4 cols) + ProductCard (image, name, desc, price, allergen icons). Dividers rendered as sub-headers, NOT ProductCards. Real cart data from `shared/fixtures/carta-mock.ts`
- `/menu-diario` — Classic menú del día: primer+segundo+postre+bebida+pan, ~18€ fixed, 3-5 options per section rotating by day. `shared/fixtures/menu-diario-mock.ts`
- `/reservas` — Standard form + SMS verification flow (send code → verify → form completes). "Cliente elige mesa" button disabled with "Próximamente" tooltip. LabsMobile test mode
- `/eventos` — Events listing (4-6 mock events, festive + music/show), CTA reservar. `shared/fixtures/eventos-mock.ts`
- `/contacto` — Hours, address (map embed), contact form (mock submit to Nitro endpoint)

### Out of Scope
- Supabase, real DB, RLS (Change #3)
- Admin `/cocina/**` (Phase 2)
- Konva table engine, Realtime (Phase 3)
- SEO meta/structured data (separate change)
- i18n — Spanish only per AGENTS.md
- Real food photography (placeholders)
- README/docs (AGENTS.md §8)

## Capabilities

### New Capabilities
- `public-ui`: Design system — terracotta palette, serif (Playfair/Cormorant) + sans (Inter/Manrope) typography, responsive grid, hover/transition tokens
- `carta-navigation`: Carta page — sticky CategorySelector with scroll-spy, ProductGrid responsive, ProductCard. Dividers as sub-headers
- `menu-diario`: Menú del día page — rotating daily options, card/list layout, fixed-price display
- `reservas-flow`: Reservation form with multi-step SMS verification. Form fields: nombre, teléfono, email, fecha/hora, comensales
- `eventos-gallery`: Events page — date, title, description, placeholder image, CTA for each event
- `contacto`: Contact page — hours/address/map embed + form (nombre, email, mensaje) mock-submits to Nitro endpoint
- `sms-module`: Provider-agnostic SMS interface (`shared/contracts/sms.contract.ts`) + LabsMobile adapter (`server/sms/labsmobile.ts`) + mock adapter (`server/sms/mock.ts`) for dev. Nitro routes at `/api/sms/send`, `/api/sms/verify`

### Modified Capabilities
None. All existing specs (app-architecture, nuxt-app-stack, test-harness) are unchanged.

## Approach

**Pages**: File-based routing — `app/pages/carta.vue`, `app/pages/menu-diario.vue`, `app/pages/reservas.vue`, `app/pages/eventos.vue`, `app/pages/contacto.vue`. Home at existing `app/pages/index.vue` (rewritten). Each page is a composition surface importing UI components from `app/components/`.

**UI components**: `CategorySelector.vue`, `ProductGrid.vue`, `ProductCard.vue`, `SmsVerify.vue`, `ReservationForm.vue`, `EventCard.vue`, `ContactForm.vue`, `MapEmbed.vue`. Shared layout components: `AppHeader.vue`, `AppFooter.vue` in `app/components/`.

**SMS module**: Interface `SmsProvider` in `shared/contracts/sms.contract.ts`. Mock adapter (`server/sms/mock.ts`) returns code "1234", logs to console. LabsMobile adapter (`server/sms/labsmobile.ts`) calls API with `test:"1"`. Provider selection via `SMS_PROVIDER` env var.

**Mock data**: `shared/fixtures/menu-diario-mock.ts`, `shared/fixtures/eventos-mock.ts`. Nitro mock endpoints: `POST /api/sms/send`, `POST /api/sms/verify`, `POST /api/reservas`, `POST /api/contacto`.

**TDD**: Unit tests (Vitest + @vue/test-utils) for component logic. Integration tests (@nuxt/test-utils $fetch) for SSR + Nitro endpoints. E2E smoke (Playwright) for navigation across all 6 pages.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/pages/` | New/Modified | 5 new pages + rewrite `index.vue` |
| `app/components/` | New | ~10 reusable UI components |
| `app/layouts/` | Modified | Default layout with header/footer |
| `app/assets/css/main.css` | Modified | Terracotta palette, font imports via `@theme` |
| `shared/contracts/sms.contract.ts` | New | SmsProvider interface |
| `shared/fixtures/` | New files | `menu-diario-mock.ts`, `eventos-mock.ts` |
| `server/sms/` | New | `labsmobile.ts`, `mock.ts` adapters |
| `server/api/` | New | `sms/send.post.ts`, `sms/verify.post.ts`, `reservas.post.ts`, `contacto.post.ts` |
| `test/` | New | Unit + integration + E2E tests |
| `nuxt.config.ts` | Modified | Add `@nuxt/image`, `@nuxt/fonts` modules |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@nuxt/image` Nuxt 4.4.8 compat | Med | Fallback: native `loading="lazy"` + `<img>` |
| `@nuxt/fonts` Nuxt 4.4.8 compat | Med | Fallback: Google Fonts CSS `@import` |
| Scroll-spy breaks in SSR (no `IntersectionObserver` on server) | Med | Guard with `process.client`, wrap in `<ClientOnly>` or `onMounted` |
| Tailwind v4 `@theme` for custom terracotta palette breaks utility generation | Low | Test early; fallback to CSS custom properties |
| Change size >400 lines | High | Flag `size:exception` in sdd-tasks; use chained PRs if needed |

## Rollback Plan

Revert commit. Pages are self-contained with no DB state. Mock data is static. No user data affected.

## Dependencies

- Nuxt 4.4.8, Vue 3, Tailwind v4 (installed in Change #1)
- Vitest, @vue/test-utils, @nuxt/test-utils, Playwright (installed in Change #1)
- LabsMobile API (server-side only, env-protected `.env`)
- `@nuxt/image` and `@nuxt/fonts` (add as dependencies)

## Success Criteria

- [ ] All 6 pages render SSR HTML via `$fetch`, HTTP 200, Spanish content visible
- [ ] Carta CategorySelector scroll-spy updates active category on vertical scroll
- [ ] Carta dividers ("— CARNES —") render as sub-headers, NOT ProductCards
- [ ] SMS verification flow: send → receive mock code "1234" → verify → form submits
- [ ] "Cliente elige mesa" button disabled with "Próximamente" tooltip on `/reservas`
- [ ] Unit tests pass (RED→GREEN): CategorySelector scroll logic, SMS verify flow, ProductCard rendering
- [ ] Integration tests pass: all 4 Nitro mock endpoints return valid JSON
- [ ] Playwright E2E smoke: navigate home → carta → menu-diario → reservas → eventos → contacto
- [ ] Visual palette: terracotta accent + cream bg + dark slate text + serif headings per design direction
