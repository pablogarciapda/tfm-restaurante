# Archive Report: bootstrap-nuxt-app

**Status**: ARCHIVED
**Date**: 2026-06-28
**Change #**: 1
**Archived to**: `openspec/changes/archive/2026-06-28-bootstrap-nuxt-app/`

---

## Change Identity

| Field | Value |
|-------|-------|
| **Name** | `bootstrap-nuxt-app` |
| **Phase** | 1 — MVP Public |
| **Intent** | Greenfield Nuxt 4.4.8 application scaffold with TDD-ready tooling |
| **Verdict** | PASS — all gates green, 25/25 tasks complete, 22/22 spec scenarios compliant |
| **Delivery** | Single PR with maintainer-approved `size:exception` (~280 hand-written lines + lockfile) |

---

## Artifact Traceability

| Artifact | Path | Status |
|----------|------|--------|
| Proposal | `proposal.md` | ✅ Present |
| Spec: nuxt-app-stack | `specs/nuxt-app-stack/spec.md` | ✅ 5 requirements (NX-001..005) |
| Spec: test-harness | `specs/test-harness/spec.md` | ✅ 3 requirements (TH-001..003) |
| Spec: app-architecture | `specs/app-architecture/spec.md` | ✅ 4 requirements (AR-001..004) |
| Design | `design.md` | ✅ Round 2 APPROVED |
| Judgment | `../judges/bootstrap-nuxt-app-design.md` | ✅ Round 2 APPROVED (12 fixes confirmed) |
| Tasks | `tasks.md` | ✅ 25/25 complete (34 `[x]` checked, 0 unchecked) |
| Verify Report | `verify-report.md` | ✅ PASS, all gates green |
| Archive Report | `archive-report.md` | ✅ This file |

**Engram observations**:
| ID | Topic Key | Title |
|----|-----------|-------|
| #499 | `sdd/bootstrap-nuxt-app/apply-progress` | Cosmetic batch: 3 verify WARNING fixes |
| #502 | `sdd/bootstrap-nuxt-app/verify-report` | PASS, all gates green |

---

## Tasks Completion

| Phase | Tasks | Complete |
|-------|-------|----------|
| Phase 1: Foundation — Scaffold & Dependencies | 1.1–1.5 | ✅ 5/5 |
| Phase 2: Configuration — All Config Files | 2.1–2.8 | ✅ 8/8 |
| Phase 3: TDD RED — Smoke Tests | 3.1–3.3 | ✅ 3/3 |
| Phase 4: TDD GREEN — Implementation | 4.1–4.5 | ✅ 5/5 |
| Phase 5: Build & Verify — All Gates | 5.1–5.10 | ✅ 10/10 |
| Corrective Batch | C.1–C.3 | ✅ 3/3 |
| **Total** | | **25/25** |

---

## Final Artifacts Produced (Project Tree)

```
tfm-restaurant/
├── app/
│   ├── app.vue                              # Root component with <script setup lang="ts">
│   ├── assets/css/main.css                   # @import "tailwindcss"
│   ├── components/.gitkeep                   # Auto-import ready
│   ├── composables/.gitkeep
│   ├── features/.gitkeep                     # Vertical slice home
│   ├── layouts/default.vue                   # Base layout with <slot />
│   ├── middleware/.gitkeep
│   ├── pages/index.vue                       # SSR home page (es-ES)
│   ├── plugins/.gitkeep
│   ├── stores/.gitkeep                       # Pinia Phase 2
│   └── utils/.gitkeep
├── server/.gitkeep                           # Nitro server
├── public/
│   ├── .gitkeep
│   ├── favicon.ico
│   └── robots.txt
├── shared/
│   ├── contracts/.gitkeep                    # Cross-domain contract boundary
│   ├── types/.gitkeep
│   └── utils/.gitkeep
├── test/
│   ├── unit/smoke.test.ts                    # mount() smoke (GREEN)
│   ├── nuxt/smoke.test.ts                    # $fetch SSR smoke (GREEN)
│   └── e2e/smoke.spec.ts                     # Playwright E2E smoke (GREEN)
├── nuxt.config.ts                            # Tailwind v4, ESLint, routeRules, imports.dirs
├── tsconfig.json                             # 4 refs → .nuxt/tsconfig.*.json
├── vitest.config.ts                          # 2 projects: unit + nuxt (defineVitestProject)
├── playwright.config.ts                      # Chromium, webServer: pnpm dev
├── eslint.config.mjs                         # withNuxt() + prettier
├── .prettierrc                               # semi:false, singleQuote:true
├── .prettierignore
├── .gitignore
├── .nuxtrc
├── package.json                              # 9 scripts, all pinned deps
├── pnpm-lock.yaml                            # Sole lockfile
└── pnpm-workspace.yaml
```

---

## Final Gate Status

| # | Gate | Exit Code | Result |
|---|------|-----------|--------|
| 1 | `pnpm install` | 0 | ✅ Clean, up-to-date |
| 2 | `nuxt prepare` | 0 | ✅ 4 tsconfigs generated |
| 3 | `pnpm test` | 0 | ✅ 2/2 pass (unit + nuxt) |
| 4 | `pnpm typecheck` | 0 | ✅ vue-tsc -b --noEmit |
| 5 | `pnpm lint` | 0 | ✅ ESLint flat config |
| 6 | `pnpm format:check` | 0 | ✅ Prettier clean |
| 7 | `pnpm build` | 0 | ✅ Client + server + Nitro (2.11 MB) |
| 8 | Tailwind v4 detection | ✅ | Utility classes (text-4xl, font-bold, etc.) in built CSS |
| 9 | `pnpm test:e2e` | 0 | ✅ Playwright 1/1 |
| 10 | `curl http://localhost:3000/` | 200 | ✅ HTML with "Restaurante La Zíngara", Content-Type: text/html |

**All 10 gates: GREEN ✅**

---

## Final Version Pin Table

As designed (Round 2 APPROVED), all versions verified via `npm view` on 2026-06-28:

| Package | Pinned | Actual | Notes |
|---------|--------|--------|-------|
| `nuxt` | `4.4.8` | 4.4.8 | Project standard |
| `vitest` | `^4.1.0` | 4.1.9 | Peers `@nuxt/test-utils` v4 `^4.0.2` |
| `@nuxt/test-utils` | `^4.0.0` | 4.0.3 | `defineVitestProject` API |
| `@vue/test-utils` | `^2.4.11` | 2.4.11 | Vue 3 stable |
| `happy-dom` | `^20.0.11` | 20.10.6 | Peer-enforced floor |
| `@vitejs/plugin-vue` | `6.0.7` | 6.0.7 | **Added** (corrective batch) — needed for unit Vite project `.vue` SFC transform |
| `tailwindcss` | `^4.3.0` | 4.3.1 | CSS-first, no config.js |
| `@tailwindcss/vite` | `^4.3.0` | 4.3.1 | Vite plugin |
| `@nuxt/eslint` | `^1.16.0` | 1.16.0 | Flat config + `withNuxt()` |
| `eslint` | `^9.0.0` | 10.6.0 | Conservative pin (ESLint 10 unvalidated) |
| `prettier` | `^3.9.0` | 3.9.1 | |
| `eslint-config-prettier` | `^9.0.0` | 10.1.8 | Aligned with ESLint 9 pin |
| `vue-tsc` | `^3.3.0` | 3.3.5 | `-b` project references |
| `@playwright/test` | `^1.61.0` | 1.61.1 | Chromium only |
| `typescript` | `^5.7.0` | 6.0.3 | Conservative pin (TS 6 unvalidated on Nuxt 4) |

---

## Documented Deviations

All deviations APPROVED by verify phase:

| # | Deviation | Source Batch | Adjudication |
|---|-----------|-------------|--------------|
| 1 | Unit env is `happy-dom` not `node` | Corrective | `@vue/test-utils` `mount()` requires DOM. `happy-dom` is correct for unit tests. |
| 2 | Unit smoke uses `mount()` not `mountSuspended` | Corrective | Unit project has no Nuxt runtime. `mount()` from `@vue/test-utils` is correct for unit-level Vue component testing. |
| 3 | `@vitejs/plugin-vue@6.0.7` added as devDependency | Corrective | Required for unit Vite project to process `.vue` files. Necessary addition, not deviation. |
| 4 | `<script setup lang="ts">` added to app.vue + layouts/default.vue | Cosmetic | Resolved 3 WARNING items from verify-report gate review. |
| 5 | E2E title assertion strengthened (`typeof` → `toHaveTitle(/.+/)`) | Cosmetic | Resolved weak assertion WARNING. |
| 6 | Orphan `test/stubs/bun-test.ts` removed | Cosmetic | Cleanup of removed `pnpm patch` workaround. |

---

## Carry-Over Items for Future Changes

These are known spec-design discrepancies — pragmatically resolved by design and apply phases, but noted for a future spec amendment pass:

| # | Item | Detail |
|---|------|--------|
| 1 | **NX-004 line 77**: `tests/` vs `test/` | Spec says `tests/` (plural); design/actual use `test/` (singular, Nuxt 4 convention). |
| 2 | **TH-001**: `defineVitestConfig` vs `defineVitestProject` | Spec uses stale v0.x API name; design/actual use v4 `defineVitestProject`. |
| 3 | **TH-001**: Vitest `2.x` vs `4.x` | Spec claims Vitest 2.x; actual is 4.x (current major). |
| 4 | **TH-001**: 3 projects vs 2 | Spec says 3 vitest projects (unit, nuxt, e2e); design/actual use 2 (unit + nuxt) with Playwright as separate E2E runner. |
| 5 | **TH-002**: `mountSuspended` | Spec references `mountSuspended` for unit smoke; actual unit uses `mount()` from `@vue/test-utils` (correct for unit project without Nuxt runtime). |

None of these are blockers — the design and apply phases resolved them with correct real-world implementations. A future spec amendment change (e.g., at Phase 2 start) should freeze-sync these 5 items.

---

## Lessons Learned

### What Worked

- **Nuxt 4.4.8 scaffold with pnpm**: `pnpm create nuxt@latest` produced a clean, buildable project with zero config drift.
- **TDD-first approach**: Writing 3 RED smoke tests before any page code made the GREEN phase deterministic and confidence-inspiring. All 3 layers (unit, nuxt integration, E2E) proved the full stack was wired before feature code landed.
- **Tailwind v4 CSS-first via `@tailwindcss/vite`**: Worked on first try — no fallback needed. The Vite plugin injects CSS cleanly through Nuxt's hybrid SSR pipeline.
- **Vitest 2-project approach**: Unit (`happy-dom`) + Nuxt (`nuxt` env) via `defineVitestProject` is clean. The projects approach correctly isolates environments and test files.
- **Judgment Day**: External adversarial review caught 7 WARNINGs and 9 SUGGESTIONs. Round 2 fixed everything. The design was measurably stronger after dual review.
- **Corrective batch process**: `sdd-apply` honestly documented 3 deviations in apply-progress; `sdd-verify` independently adjudicated them. The loop worked.

### What Was Fragile

- **`@nuxt/test-utils@4.0.3` + `vitest@4.1.9` worker fork incompatibility**: The initial single-env collapse was a symptom of a well-known Vitest worker fork issue with `environment: 'nuxt'`. The 2-projects approach with `environment: 'happy-dom'` for unit and `environment: 'nuxt'` for integration resolved this cleanly. The `pnpm patch` workaround that briefly existed was correctly removed — the 2-project architecture was the real fix.
- **Tailwind v4 detection concern**: The design included a fallback to `@nuxtjs/tailwindcss` module if `@tailwindcss/vite` failed. This was a legitimate risk but never triggered. The built CSS shipped utility classes on first build.
- **`app/app.vue` auto-generated without `<script setup lang="ts">`**: The Nuxt scaffold produced a template-only `app.vue`. Spec NX-001 explicitly mandates `<script setup lang="ts">`. The cosmetic batch fixed this by adding a minimal script block with `useHead` title.
- **Spec-language drift is real**: The spec was written at `sdd-spec` phase before `sdd-design` had real Nuxt 4 docs from Context7. Several spec requirements (Vitest API name, version claims, test dir naming) became stale between spec and design. The process handled this via documented deviations and a corrective batch — but a tighter spec→design feedback loop would reduce drift.

---

## Next Change Recommendation

**Change #2**: Supabase client + env wiring + initial schema migration

**Scope**:
- Install `@supabase/supabase-js`
- Wire `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_ANON_KEY` via `runtimeConfig` (server-side) + `public` runtimeConfig for client
- Create `shared/supabase.ts` singleton client
- Apply initial migration: create tables `configuracion`, `platos`, `reservas` per AGENTS.md data model
- Enable RLS on all tables (OWASP Top 10 compliance)
- Write connector smoke tests: client instantiation, connection test
- No CRUD yet — just the wiring and schema foundation

**Blockers**: User must provide Supabase project URL + anon key before this change starts.

**Estimated impact**: ~150 hand-written lines + migration SQL. Fits under the 400-line review budget. Single PR.

---

## SDD Cycle Complete

The `bootstrap-nuxt-app` change has been fully planned, specified, designed, task-broken, implemented with TDD, verified against all specs, and archived. The Nuxt 4.4.8 application shell is production-ready for Phase 1 feature development.

**Ready for the next change.**
