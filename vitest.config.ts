import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,vue}', 'server/**/*.{ts,vue}', 'shared/**/*.{ts,vue}'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/__fixtures__/**'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'happy-dom',
        },
        plugins: [vue()],
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
        resolve: {
          alias: {
            // Workaround for @nuxt/test-utils@4.0.3: Vite import-analysis cannot
            // resolve `bun:test` in Node runtime. Alias to a stub that satisfies
            // the dynamic import in setupBun() without Vite trying to bundle it.
            'bun:test': fileURLToPath(
              new URL('./test/__fixtures__/bun-test-stub.ts', import.meta.url),
            ),
          },
        },
      }),
    ],
  },
})
