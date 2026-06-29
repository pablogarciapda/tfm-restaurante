/**
 * bun-test-stub.ts — Stub for `bun:test` in Node/Vitest runtime
 *
 * @nuxt/test-utils@4.0.3 has a dynamic `await import('bun:test')` that Vite's
 * import-analysis plugin catches and tries to bundle. This stub is aliased via
 * vitest.config.ts `resolve.alias` so Vite never sees the real `bun:test` module.
 *
 * The stub exports the functions that @nuxt/test-utils' setupBun() expects:
 * mock, beforeAll, afterAll, etc. These are no-ops since we're not in Bun.
 */

const noop = () => {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = () => ((..._args: any[]) => noop) as any

export { mock, noop as beforeAll, noop as afterAll, noop as beforeEach, noop as afterEach }

export default { mock, beforeAll: noop, afterAll: noop, beforeEach: noop, afterEach: noop }
