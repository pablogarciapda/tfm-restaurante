# test-harness Specification

## Purpose

TDD-ready test stack for Restaurante La Zíngara. Proves all three testing layers (unit, integration, E2E) are wired before feature code is written. Greenfield — no existing test runner.

## Requirements

### Requirement: TH-001 — Vitest Stack with @nuxt/test-utils (Projects Approach)

The system MUST use Vitest 2.x with `@nuxt/test-utils` configured via the Vitest **projects** approach (`defineVitestConfig` from `@nuxt/test-utils/config`). Three separate projects: `unit`, `nuxt` (integration), `e2e`. `happy-dom` MUST be an explicit `devDependency`. Unit component tests MUST use `mountSuspended` from `@nuxt/test-utils/runtime`. Integration tests MUST use `$fetch` from `@nuxt/test-utils/e2e`. Playwright MUST be installed for E2E. Test files for Nuxt context live in `test/nuxt/`.

| Success Criterion | Verification |
|---|---|
| No unresolved peer conflicts | `pnpm ls` shows clean dependency tree |
| `vitest.config.ts` uses `defineVitestConfig` with 3 projects | Config references `unit`, `nuxt`, `e2e` projects |
| `happy-dom` in `devDependencies` | `package.json` lists it explicitly |

#### Scenario: Dependencies install without peer conflicts

- GIVEN `pnpm install` runs
- WHEN checking peer dependency warnings
- THEN no unresolved `vitest`, `@nuxt/test-utils`, or `playwright` conflicts exist
- AND if a peer mismatch IS detected, the version MUST be pinned before tests can run

#### Scenario: Playwright browser download failure is handled

- GIVEN `pnpm exec playwright install chromium` fails (network, disk, or permissions)
- WHEN `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set as env fallback
- THEN the install MUST NOT fail
- AND `package.json` MUST surface a pre-test hook or `test:e2e:install` script so browser install is explicit before `pnpm test:e2e`

#### Scenario: Vitest projects config resolves

- GIVEN `vitest.config.ts` defines `unit`, `nuxt`, and `e2e` projects
- WHEN `pnpm test` runs
- THEN each project's test files are discovered and executed
- AND the nuxt project uses `environment: 'nuxt'` with all Nuxt auto-imports available

### Requirement: TH-002 — Three Smoke Tests (TDD RED-first)

The system MUST have three smoke tests written BEFORE the production code they verify (TDD RED phase). All three MUST pass after implementation.

#### Scenario: Unit — Vue component renders via mountSuspended

- GIVEN a Vue component exists in `app/components/` or `app/pages/`
- WHEN Vitest mounts it via `mountSuspended` from `@nuxt/test-utils/runtime`
- THEN the wrapper is truthy and contains expected text
- AND no mount-time errors are thrown

#### Scenario: Integration — SSR `/` returns 200

- GIVEN `@nuxt/test-utils` Nuxt environment is active
- WHEN a test fetches `/` via `$fetch`
- THEN the HTTP status is 200
- AND the response body is non-empty HTML

#### Scenario: E2E — Playwright loads `/`

- GIVEN the Nuxt dev server is running as Playwright's `webServer`
- WHEN Playwright executes `page.goto('/')`
- THEN the page loads without uncaught console errors
- AND a `<title>` element is present in the DOM

### Requirement: TH-003 — Code Quality Gates

The system MUST have `@nuxt/eslint` registered as a module in `nuxt.config.ts` (flat config). Prettier MUST be installed and configured. `pnpm lint` MUST pass; `pnpm format --check` MUST report clean. `pnpm typecheck` MUST use `vue-tsc -b --noEmit`.

#### Scenario: ESLint flat config passes on clean scaffold

- GIVEN `@nuxt/eslint` module is registered and scaffold is complete
- WHEN `pnpm lint` executes
- THEN exit code is 0

#### Scenario: TypeScript strict type-check passes

- GIVEN all `.vue` and `.ts` files have strictly valid TypeScript
- WHEN `pnpm typecheck` (`vue-tsc -b --noEmit`) runs
- THEN exit code is 0 and no TS errors are reported

#### Scenario: Prettier format check reports clean

- GIVEN all source files are formatted
- WHEN `pnpm format --check` runs
- THEN exit code is 0
