import { describe, it, expect } from 'vitest'
import { mockCarta } from '../../../shared/fixtures/carta-mock'

/**
 * Task 2.1.3 — Verify carta-mock.ts enrichment fields (CN-004)
 *
 * Enriched fields: descripcion, imagen_url, alergenos, calorias
 * Must be present on platos (not dividers with empty precio).
 */
describe('Carta mock enrichment (CN-004)', () => {
  const allPlatos = mockCarta.flatMap((cat) =>
    cat.platos.map((p) => ({ ...p, categoria: cat.categoria }))
  )

  // Filter only platos with a non-empty precio (divider dishes have precio='')
  const pricedPlatos = allPlatos.filter((p) => p.precio.trim() !== '')

  it('should have at least 50 priced platos across all categories', () => {
    expect(pricedPlatos.length).toBeGreaterThanOrEqual(50)
  })

  it('every priced plato should have a descripcion (non-empty string)', () => {
    for (const plato of pricedPlatos) {
      expect(typeof plato.descripcion).toBe('string')
      expect(plato.descripcion!.trim()).not.toBe('')
    }
  })

  it('every priced plato should have an imagen_url (non-empty string)', () => {
    for (const plato of pricedPlatos) {
      expect(typeof plato.imagen_url).toBe('string')
      expect(plato.imagen_url!.trim()).not.toBe('')
    }
  })

  it('every priced plato should have alergenos array (length >= 0)', () => {
    for (const plato of pricedPlatos) {
      expect(Array.isArray(plato.alergenos)).toBe(true)
    }
  })

  it('at least 30% of priced platos should have at least one alergeno', () => {
    const withAlergenos = pricedPlatos.filter(
      (p) => Array.isArray(p.alergenos) && p.alergenos!.length > 0
    )
    expect(withAlergenos.length).toBeGreaterThanOrEqual(pricedPlatos.length * 0.3)
  })

  it('alergenos should only use known values (gluten, lactosa, frutos-secos, mariscos, huevo, soja)', () => {
    const known = new Set(['gluten', 'lactosa', 'frutos-secos', 'mariscos', 'huevo', 'soja'])
    for (const plato of pricedPlatos) {
      if (plato.alergenos && plato.alergenos.length > 0) {
        for (const a of plato.alergenos) {
          expect(known.has(a)).toBe(true)
        }
      }
    }
  })

  it('every priced plato should have calorias (number, > 0)', () => {
    for (const plato of pricedPlatos) {
      expect(typeof plato.calorias).toBe('number')
      expect(plato.calorias!).toBeGreaterThan(0)
    }
  })

  it('some platos should have min 2 alergenos for multi-allergen display (CN-004)', () => {
    const multiAllergen = pricedPlatos.filter(
      (p) => Array.isArray(p.alergenos) && p.alergenos!.length >= 2
    )
    expect(multiAllergen.length).toBeGreaterThanOrEqual(1)
  })

  it('divider platos (empty precio) should remain unchanged (no enrichment required)', () => {
    const dividers = allPlatos.filter((p) => p.precio.trim() === '')
    // They exist and their plato field should be non-empty
    for (const d of dividers) {
      expect(d.plato.trim()).not.toBe('')
    }
  })
})
