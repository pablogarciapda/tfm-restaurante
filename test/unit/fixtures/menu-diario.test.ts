import { describe, it, expect } from 'vitest'

// RED: test references module that does not exist yet
import { mockMenuDiario, type MenuDiarioDia } from '../../../shared/fixtures/menu-diario-mock'

describe('MenuDiario mock fixture (MD-004)', () => {
  it('should have exactly 7 days', () => {
    expect(mockMenuDiario).toHaveLength(7)
  })

  it('should cover all days 0 (Sunday) through 6 (Saturday)', () => {
    const days = mockMenuDiario.map((d: MenuDiarioDia) => d.dia).sort()
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('each day should have a price field (string, non-empty)', () => {
    for (const dia of mockMenuDiario) {
      expect(typeof dia.precio).toBe('string')
      expect(dia.precio.trim()).not.toBe('')
      // Price should be roughly ~18€
      expect(dia.precio).toMatch(/^\d/)
    }
  })

  it('each day should have exactly 5 sections', () => {
    for (const dia of mockMenuDiario) {
      expect(dia.secciones).toHaveLength(5)
    }
  })

  it('should have Spanish section labels in standard order', () => {
    const expectedLabels = [
      'Primer Plato',
      'Segundo Plato',
      'Postre',
      'Bebida',
      'Pan y Cubiertos',
    ]
    for (const dia of mockMenuDiario) {
      const labels = dia.secciones.map((s) => s.nombre)
      expect(labels).toEqual(expectedLabels)
    }
  })

  it('each section should have between 2 and 6 platos', () => {
    for (const dia of mockMenuDiario) {
      for (const seccion of dia.secciones) {
        expect(seccion.platos.length).toBeGreaterThanOrEqual(2)
        expect(seccion.platos.length).toBeLessThanOrEqual(6)
      }
    }
  })

  it('each plato should have a nombre (string, non-empty)', () => {
    for (const dia of mockMenuDiario) {
      for (const seccion of dia.secciones) {
        for (const plato of seccion.platos) {
          expect(typeof plato.nombre).toBe('string')
          expect(plato.nombre.trim()).not.toBe('')
        }
      }
    }
  })

  it('each day should have different dishes from the previous day', () => {
    // At least some sections should differ between consecutive days
    for (let i = 0; i < mockMenuDiario.length - 1; i++) {
      const todayNames = mockMenuDiario[i].secciones[0].platos.map((p) => p.nombre)
      const nextDayNames = mockMenuDiario[i + 1].secciones[0].platos.map((p) => p.nombre)
      // Not all identical — at least one different dish
      const hasDifference =
        todayNames.some((n) => !nextDayNames.includes(n)) ||
        nextDayNames.some((n) => !todayNames.includes(n))
      expect(hasDifference).toBe(true)
    }
  })
})
