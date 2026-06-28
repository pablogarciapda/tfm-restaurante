import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt({
  ignores: [
    '.nuxt/',
    'dist/',
    'node_modules/',
    '.output/',
    'playwright-report/',
  ],
  extends: [prettier],
})
