/**
 * reserva-overlap.test.ts — Whole-service (turn) blocking semantics
 *
 * Per restaurant rule (consigna): a reservation on a mesa blocks that mesa
 * for the ENTIRE service (comida or cena) of that day. A reserva at 22:00
 * blocks 21:00, 23:00, etc. — same mesa, same date, same turn = conflict.
 */
import { describe, it, expect } from 'vitest'
import { hasMesaConflict, buildTurnoWindows } from '../../../shared/utils/reserva-overlap'

const HORARIOS = {
  comida_inicio: '13:30',
  comida_fin: '15:30',
  cena_inicio: '21:00',
  cena_fin: '23:30',
  intervalo_minutos: 15,
}

const turnos = buildTurnoWindows(HORARIOS as any)

/** Build fecha_hora ISO for a local date+time (round-trips to local hours). */
function iso(day: number, h: number, m = 0): string {
  return new Date(2026, 8, day, h, m).toISOString() // month 8 = September
}

describe('hasMesaConflict — full-service blocking', () => {
  const mesaReservas = (time: string, estado = 'confirmada') => [
    { fecha_hora: iso(10, 21, 0), estado },
  ]

  it('blocks 22:00 when mesa has a reserva at 21:00 (same cena turn)', () => {
    expect(hasMesaConflict(mesaReservas(iso(10, 21)), iso(10, 22), turnos)).toBe(true)
  })

  it('blocks 21:00 when mesa has a reserva at 22:00 (reverse direction)', () => {
    const existing = [{ fecha_hora: iso(10, 22, 0), estado: 'confirmada' }]
    expect(hasMesaConflict(existing, iso(10, 21, 0), turnos)).toBe(true)
  })

  it('blocks any hour of the same service (23:15 vs 21:00)', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'confirmada' }]
    expect(hasMesaConflict(existing, iso(10, 23, 15), turnos)).toBe(true)
  })

  it('does NOT block a different service on the same day (cena vs comida)', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'confirmada' }]
    expect(hasMesaConflict(existing, iso(10, 14, 0), turnos)).toBe(false)
  })

  it('does NOT block cancelada reservations', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'cancelada' }]
    expect(hasMesaConflict(existing, iso(10, 22, 0), turnos)).toBe(false)
  })

  it('does NOT block completada reservations', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'completada' }]
    expect(hasMesaConflict(existing, iso(10, 22, 0), turnos)).toBe(false)
  })

  it('does NOT block grande reservations on a different date', () => {
    const existing = [{ fecha_hora: iso(11, 21, 0), estado: 'confirmada' }]
    expect(hasMesaConflict(existing, iso(10, 21, 0), turnos)).toBe(false)
  })

  it('blocks pendiente reservations (whole service pending block)', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'pendiente' }]
    expect(hasMesaConflict(existing, iso(10, 22, 0), turnos)).toBe(true)
  })

  it('does NOT conflict when new time is outside both turns', () => {
    const existing = [{ fecha_hora: iso(10, 21, 0), estado: 'confirmada' }]
    expect(hasMesaConflict(existing, iso(10, 17, 0), turnos)).toBe(false)
  })
})
