import { describe, it, expect } from 'vitest'
import { mockEventos } from '../../../shared/fixtures/eventos-mock'

describe('Eventos mock fixture (EG-001, EG-002)', () => {
  it('should have between 4 and 6 events', () => {
    expect(mockEventos.length).toBeGreaterThanOrEqual(4)
    expect(mockEventos.length).toBeLessThanOrEqual(6)
  })

  it('every event should have required fields (id, fecha, titulo, descripcion, categoria)', () => {
    for (const evento of mockEventos) {
      expect(typeof evento.id).toBe('string')
      expect(evento.id.trim()).not.toBe('')
      expect(typeof evento.fecha).toBe('string')
      expect(evento.fecha.trim()).not.toBe('')
      expect(typeof evento.titulo).toBe('string')
      expect(evento.titulo.trim()).not.toBe('')
      expect(typeof evento.descripcion).toBe('string')
      expect(evento.descripcion.trim()).not.toBe('')
      expect(['festivo', 'espectaculo']).toContain(evento.categoria)
    }
  })

  it('should have at least one future event', () => {
    const now = new Date()
    const futureEvents = mockEventos.filter((e) => new Date(e.fecha) >= now)
    expect(futureEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('should have at least one past event', () => {
    const now = new Date()
    const pastEvents = mockEventos.filter((e) => new Date(e.fecha) < now)
    expect(pastEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('should have at least one sold-out event', () => {
    const soldOut = mockEventos.filter((e) => e.soldOut === true)
    expect(soldOut.length).toBeGreaterThanOrEqual(1)
  })

  it('should contain both festivo and espectaculo categories', () => {
    const categorias = mockEventos.map((e) => e.categoria)
    expect(categorias).toContain('festivo')
    expect(categorias).toContain('espectaculo')
  })

  it('should have unique IDs', () => {
    const ids = mockEventos.map((e) => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have valid fecha format (YYYY-MM-DD)', () => {
    for (const evento of mockEventos) {
      expect(evento.fecha).toMatch(/^\d{4}-\d{2}-\d{2}/)
      // Should parse as a valid date
      const d = new Date(evento.fecha)
      expect(d.toString()).not.toBe('Invalid Date')
    }
  })
})
