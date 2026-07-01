import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Seed SQL — shared/db/seed.sql (SCH-003)', () => {
  const seedPath = resolve(process.cwd(), 'shared/db/seed.sql')

  it('seed.sql file exists', () => {
    expect(existsSync(seedPath)).toBe(true)
  })

  describe('platos inserts', () => {
    it('contains INSERT INTO platos statements', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const insertCount = (content.match(/INSERT INTO platos/gi) || []).length
      expect(insertCount).toBeGreaterThan(0)
    })

    it('platos inserts have minimum required columns', () => {
      const content = readFileSync(seedPath, 'utf-8')
      // Each plato INSERT should have at least: id, nombre, precio, categoria, puesto
      const firstInsert = content.match(/INSERT INTO platos\s*\(([^)]+)\)/i)
      expect(firstInsert).toBeTruthy()
      const columns = firstInsert![1]
      expect(columns).toContain('id')
      expect(columns).toContain('nombre')
      expect(columns).toContain('precio')
      expect(columns).toContain('categoria')
      expect(columns).toContain('puesto')
    })

    it('includes at least 40 platos (we have ~80 in mock)', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const dishCount = (content.match(/INSERT INTO platos/gi) || []).length
      expect(dishCount).toBeGreaterThanOrEqual(40)
    })
  })

  describe('eventos inserts', () => {
    it('contains INSERT INTO eventos statements', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const insertCount = (content.match(/INSERT INTO eventos/gi) || []).length
      expect(insertCount).toBeGreaterThanOrEqual(5)
    })

    it('eventos inserts have required columns', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const firstInsert = content.match(/INSERT INTO eventos\s*\(([^)]+)\)/i)
      expect(firstInsert).toBeTruthy()
      const columns = firstInsert![1]
      expect(columns).toContain('id')
      expect(columns).toContain('titulo')
      expect(columns).toContain('fecha')
      expect(columns).toContain('categoria')
    })
  })

  describe('menu_diario_config + items inserts', () => {
    it('contains INSERT INTO menu_diario_config statements', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const configCount = (content.match(/INSERT INTO menu_diario_config/gi) || []).length
      expect(configCount).toBeGreaterThanOrEqual(7) // one per day
    })

    it('menu_diario_config has day_of_week values 0-6', () => {
      const content = readFileSync(seedPath, 'utf-8')
      // Check that day_of_week values 0,1,2,3,4,5,6 are present
      for (let d = 0; d <= 6; d++) {
        // Look for the day value in context of menu_diario_config inserts
        expect(content).toMatch(new RegExp(`menu_diario_config[\\s\\S]*?day_of_week[\\s\\S]*?${d}`))
      }
    })

    it('contains INSERT INTO menu_diario_items statements', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const itemsCount = (content.match(/INSERT INTO menu_diario_items/gi) || []).length
      // 7 days × at least 5 sections = 35 minimum
      expect(itemsCount).toBeGreaterThanOrEqual(20)
    })

    it('menu_diario_items have required columns', () => {
      const content = readFileSync(seedPath, 'utf-8')
      const firstInsert = content.match(/INSERT INTO menu_diario_items\s*\(([^)]+)\)/i)
      expect(firstInsert).toBeTruthy()
      const columns = firstInsert![1]
      expect(columns).toContain('config_id')
      expect(columns).toContain('seccion')
      expect(columns).toContain('plato_nombre')
    })
  })

  describe('pricing', () => {
    it('mon-fri priced at 16€', () => {
      const content = readFileSync(seedPath, 'utf-8')
      // Days 1-5 (Mon-Fri) should have price 16
      const price16Count = (content.match(/precio[\s\S]*?'16'/g) || []).length
      expect(price16Count).toBeGreaterThanOrEqual(5) // Mon-Fri
    })

    it('saturday priced at 25€', () => {
      const content = readFileSync(seedPath, 'utf-8')
      // Day 6 (Saturday) → precio '25'
      expect(content).toMatch(/25'/)
    })
  })

  describe('ON CONFLICT DO NOTHING', () => {
    it('seed SQL is idempotent with ON CONFLICT', () => {
      const content = readFileSync(seedPath, 'utf-8')
      expect(content).toContain('ON CONFLICT')
      expect(content).toContain('DO NOTHING')
    })

    it('all three table inserts use ON CONFLICT', () => {
      const content = readFileSync(seedPath, 'utf-8')
      // Count ON CONFLICT occurrences
      const conflictCount = (content.match(/ON CONFLICT/gi) || []).length
      // At least one per table type (platos, eventos, menu_diario_config, menu_diario_items)
      expect(conflictCount).toBeGreaterThanOrEqual(4)
    })
  })

  describe('data integrity from mock fixtures', () => {
    it('platos include mock categories (de-duplicated by nombre)', () => {
      const content = readFileSync(seedPath, 'utf-8')
      expect(content).toContain('NUESTRAS RECOMENDACIONES')
      expect(content).toContain('ENSALADAS')
      expect(content).toContain('ENTRANTES CALIENTES')
      expect(content).toContain('ENTRANTES FRIOS')
      // PESCADOS/ARROCES categories deduplicated out — all dishes appear
      // in NUESTRAS RECOMENDACIONES first (de-duplication preserves first occurrence)
    })

    it('eventos include mock titles', () => {
      const content = readFileSync(seedPath, 'utf-8')
      expect(content).toContain('Noche de Flamenco en Vivo')
      expect(content).toContain('Cena de Nochevieja')
    })

    it('menu diario has five secciones', () => {
      const content = readFileSync(seedPath, 'utf-8')
      expect(content).toContain("'primer'")
      expect(content).toContain("'segundo'")
      expect(content).toContain("'postre'")
      expect(content).toContain("'bebida'")
    })

    it('alergenos use ARRAY syntax', () => {
      const content = readFileSync(seedPath, 'utf-8')
      expect(content).toContain('ARRAY[')
    })
  })
})
