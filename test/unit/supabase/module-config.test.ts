import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Supabase Module Configuration (AR-006)', () => {
  describe('Package installed', () => {
    it('@nuxtjs/supabase is in dependencies', () => {
      const pkgJsonPath = resolve(process.cwd(), 'package.json')
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

      expect(pkg.dependencies).toBeDefined()
      expect(pkg.dependencies['@nuxtjs/supabase']).toBeDefined()
    })
  })

  describe('Nuxt module registration', () => {
    it('nuxt.config.ts registers @nuxtjs/supabase in modules array', async () => {
      // Dynamically import the nuxt.config.ts content
      const configPath = resolve(process.cwd(), 'nuxt.config.ts')
      const configContent = readFileSync(configPath, 'utf-8')

      // Verify the module string appears in the modules array
      expect(configContent).toContain('@nuxtjs/supabase')

      // Verify the module is inside the `modules:` block
      const modulesMatch = configContent.match(/modules:\s*\[([^\]]*)\]/s)
      expect(modulesMatch).toBeTruthy()
      expect(modulesMatch![1]).toContain('@nuxtjs/supabase')
    })
  })

  describe('Environment variables', () => {
    it('.env.example contains NUXT_PUBLIC_SUPABASE_URL', () => {
      const envPath = resolve(process.cwd(), '.env.example')
      const content = readFileSync(envPath, 'utf-8')

      expect(content).toContain('NUXT_PUBLIC_SUPABASE_URL')
      expect(content).toContain('NUXT_PUBLIC_SUPABASE_KEY')
      expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY')
    })
  })

  describe('Module directory exists', () => {
    it('@nuxtjs/supabase package is installed and accessible', () => {
      const modulePath = resolve(process.cwd(), 'node_modules/@nuxtjs/supabase/package.json')
      expect(existsSync(modulePath)).toBe(true)
    })
  })
})
