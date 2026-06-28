# Judgment Day — `bootstrap-nuxt-app` Design

> Duplicate-of: Engram observation #491 (topic_key `sdd/bootstrap-nuxt-app/judgment-day-design`).
> File copy persisted under `openspec/changes/judges/` per user request for tribunal audibility.

## Round 1

**Status**: JUDGMENT: ESCALATED ⚠️ (manual human review requested after Round 1 verdict)

**Judges**: Judge B only (adversarial blind review with Context7 + npm verification).
Judge A could not execute — model `github-copilot/gpt-5-mini` unavailable in this environment. Single-judge limitation documented honestly.

**Target**: `openspec/changes/bootstrap-nuxt-app/design.md` (v2, post version-fix).

## External expert adjudication

Two external experts produced 23 findings. Adjudication with evidence from Nuxt 4 official docs (https://nuxt.com/docs/4.x/), Context7 `/nuxt/nuxt`, and `npm view`.

### REFUTED (4) — experts wrong, no fix needed

| Claim | Verdict | Evidence |
|---|---|---|
| `await defineVitestProject(...)` inside `projects: []` array is invalid TS | **REFUTED** | Nuxt 4 testing docs show EXACTLY this pattern; top-level `await` is valid ESM. https://nuxt.com/docs/4.x/getting-started/testing |
| Add `test:all` convenience script | **REFUTED** | Spec TH-001 mandates `test` and `test:e2e` as separate scripts — combining them adds complexity without spec mandate. |
| Remove `routeRules: { '/cocina/**': { ssr: false } }` from bootstrap | **REFUTED** | Spec NX-005 line 87 explicitly mandates this as Phase 2 placeholder. |
| Remove `imports.dirs: ['app/stores']` (no stores yet) | **REFUTED** | Spec NX-004 line 70 explicitly mandates this for Pinia Phase 2 wiring. |

### WARNING real (7) — recommended fix

| # | Finding | Evidence |
|---|---|---|
| 1 | `shared/contracts/` is NOT auto-imported by Nuxt 4 default; design omits `imports.dirs` | Nuxt 4 docs: "Only files in `shared/utils/` and `shared/types/` will be auto-imported." Nested dirs require `imports.dirs` or `#shared` alias. https://nuxt.com/docs/4.x/directory-structure/shared |
| 2 | Tailwind v4 rollback plan too vague | Spec NX-002 says system "MAY fall back" but design describes no detection mechanism, fallback steps, or SSR preservation strategy. |
| 3 | Vitest glob `test/unit/*.{test,spec}.ts` matches only first level | Standard glob semantics; subdir tests like `test/unit/components/Foo.test.ts` would be missed. Use `test/unit/**/*.{test,spec}.ts`. |
| 4 | `format:check` script naming conflicts with TH-003 wording | Spec TH-003 mandates `pnpm format --check` must work. With `"format": "prettier --write ."` and `"format:check": "prettier --check ."`, `pnpm format --check` expands to `prettier --write . --check` — conflicting flags. |
| 5 | Spec NX-004 line 77 says `tests/` (plural); design uses `test/` (singular) | Conflict between spec and design. Nuxt 4 convention is `test/` singular. Spec amendment needed. |
| 6 | `app/layouts/default.vue` file listed but interior not defined | Nuxt 4 routing requires `<slot />` or `<NuxtPage />` inside layout. Design doesn't specify structure. |
| 7 | Nuxt integration smoke test only checks `$fetch('/')` returns 200 | Spec TH-002 mandates "the response body is non-empty HTML". Design omits the body content assertion. |

### SUGGESTION (9) — recommended for 100%

| # | Finding | Recommendation |
|---|---|---|
| 1 | `tsconfig.json` not shown with project references exact shape | Show the explicit JSON with 4 references to `.nuxt/tsconfig.{app,server,shared,node}.json` per Nuxt 4 docs. |
| 2 | `playwright.config.ts` incomplete | Add `reuseExistingServer: !process.env.CI`, timeouts, `use.headless`, `expect.timeout`, reporter, `projects: [devices['Desktop Chrome']]`. |
| 3 | `eslint.config.mjs` lacks ignore patterns and Prettier integration | Add `ignores: ['.nuxt', 'dist', 'node_modules']` and `eslint-config-prettier` to flat config. |
| 4 | Test directory structure under-specified | Document `.gitkeep` for empty dirs, naming convention (`*.test.ts` for unit, `*.spec.ts` for E2E), smoke test file templates. |
| 5 | `happy-dom` pinned `^20.0.0` but `@nuxt/test-utils` v4 peer is `>=20.0.11` | Tighten pin to `^20.0.11` for precision. |
| 6 | `app/assets/.gitkeep` redundant | `app/assets/css/main.css` already exists in that dir; git tracks it automatically. Remove the `.gitkeep`. |
| 7 | Tailwind risk framing incorrect | Risk is `@tailwindcss/vite` plugin vs Nuxt module system, NOT "Vite 7" compatibility (Vite 7 peers are fine). |
| 8 | `compatibilityDate: '2026-06-01'` should be scaffold date | Use `'2026-06-28'` (today) to enable latest Nuxt feature flags at scaffold time. |
| 9 | `devtools: { enabled: true }` unconditional | Gate by `process.env.NODE_ENV !== 'production'` to avoid exposing devtools in production. |

## Verdict table

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING (real) | 7 | Pending fix (escalated to human) |
| WARNING (theoretical) | 0 | — |
| SUGGESTION | 9 | Pending fix (escalated to human) |
| External claims REFUTED | 4 | Closed — no action |

## Skill Resolution

`paths-injected` — judgment-day, _shared, nuxt (user-level Nuxt 3), nuxt4 (project-local Nuxt 4), vue-best-practices, typescript-advanced-types, nodejs-best-practices. Context7 queried on `/nuxt/nuxt` for official Nuxt 4 docs. npm registry verified version pins.

## Round 2

**Status**: JUDGMENT: APPROVED ✅

**Fix agent**: jd-fix-agent applied 12 surgical edits to design.md (nuxt.config.ts correction, tsconfig.json single root pattern, typecheck with `nuxt prepare`, vitest glob recursion, playwright.config.ts full, eslint.config.mjs with prettier integration, app/layouts/default.vue content, integration smoke body assertion, tailwind risk reframing, happy-dom bump, app/assets/.gitkeep removal, compatibilityDate bump) + Judge A model swap (`github-copilot/gpt-5-mini` → `opencode-go/minimax-m3` in `~/.config/opencode/opencode.json`).

**Judges Round 2**: Judge B only (model swap to minimax-m3 saved to config but NOT picked up by running opencode process — requires restart). Single-judge limitation honestly documented; Judge B did exhaustive line-by-line verification with proof for each of the 12 fixes.

**Judge B verdict**: `VERDICT: APPROVED — Round 2 clean.`
- All 12 fixes: CONFIRMED-FIXED with line-number proofs
- 0 new CRITICAL, 0 new WARNING (real), 0 regressions
- Spec conformance re-verified for TH-003, NX-001..005, AR-001..004
- `eslint-config-prettier` pin `^9.0.0` confirmed sensible (aligns with ESLint 9)

**Outstanding (NOT design blockers — spec amendment responsibility)**:
1. Spec NX-004 line 77: `tests/` (plural) vs design's `test/` (singular) — needs minimal spec amend
2. Spec TH-001: `defineVitestConfig` (stale API name) vs design's `defineVitestProject` (real v4 API)
3. Spec TH-001: Vitest `2.x` version claim vs real `4.x`
4. Spec TH-001: Three vitest projects vs design's two (Playwright owns E2E)

These are spec-phase responsibilities for a future re-spec pass; the design is APPROVED as-is.

## Next

- SDD phase `sdd-tasks` — break the design into implementation tasks for `sdd-apply`.
- After sdd-tasks: Review Workload Guard (delivery_strategy = `single-pr`, review_budget = 400 lines).