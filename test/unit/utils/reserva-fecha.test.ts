/**
 * TDD: pure helpers for reserva date blocking (reservas pasadas).
 */
import { describe, it, expect } from 'vitest'
import { esReservaPasada, fechaReserva } from '../../../shared/utils/reserva-fecha'

const HOY = new Date(2026, 6, 16, 15, 0, 0) // 2026-07-16 15:00 local

describe('fechaReserva', () => {
  it('extracts YYYY-MM-DD from an ISO datetime', () => {
    expect(fechaReserva('2026-07-16T13:30:00')).toBe('2026-07-16')
  })
  it('extracts YYYY-MM-DD from a date-only string', () => {
    expect(fechaReserva('2026-07-15')).toBe('2026-07-15')
  })
  it('returns empty string for null/undefined/empty', () => {
    expect(fechaReserva(null)).toBe('')
    expect(fechaReserva(undefined)).toBe('')
    expect(fechaReserva('')).toBe('')
  })
})

describe('esReservaPasada', () => {
  it('returns true for a reservation strictly before today', () => {
    expect(esReservaPasada('2026-07-15T20:00:00', HOY)).toBe(true)
  })
  it('returns true for yesterday late-night', () => {
    expect(esReservaPasada('2026-07-15T23:59:00', HOY)).toBe(true)
  })
  it('returns false for today (same day, any time)', () => {
    expect(esReservaPasada('2026-07-16T00:00:00', HOY)).toBe(false)
    expect(esReservaPasada('2026-07-16T13:30:00', HOY)).toBe(false)
    expect(esReservaPasada('2026-07-16T23:59:00', HOY)).toBe(false)
  })
  it('returns false for a future reservation', () => {
    expect(esReservaPasada('2026-07-17T10:00:00', HOY)).toBe(false)
    expect(esReservaPasada('2026-12-01T12:00:00', HOY)).toBe(false)
  })
  it('returns false for null/undefined/empty (treated as not-past, so buttons stay available)', () => {
    expect(esReservaPasada(null, HOY)).toBe(false)
    expect(esReservaPasada(undefined, HOY)).toBe(false)
    expect(esReservaPasada('', HOY)).toBe(false)
  })
  it('uses day boundary in local timezone (date part only, not hour)', () => {
    // Same day, earlier hour than "now" — still NOT past (today)
    expect(esReservaPasada('2026-07-16T08:00:00', HOY)).toBe(false)
  })
})
