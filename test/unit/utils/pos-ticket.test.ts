/**
 * pos-ticket.test.ts — ESC/POS ticket builder for reservation printing
 */
import { describe, it, expect } from 'vitest'
import { buildPosTicketLines, posTicketBytes, POS_INIT, POS_PARTIAL_CUT } from '../../../shared/utils/pos-ticket'

const sample = {
  referencia: 'ABCD-1ENE',
  fecha_hora: '2026-09-10T19:00:00.000Z',
  numero_comensales: 4,
  nombre: 'María García',
  apellidos: 'López',
  telefono: '600 123 456',
  zona: 'Principal',
  mesa_num: 7,
  restaurante: 'La Zíngara',
}

describe('buildPosTicketLines', () => {
  it('includes header, reference, date/time, guests and contact', () => {
    const lines = buildPosTicketLines(sample)
    const all = lines.join('\n')
    expect(all).toContain('LA ZINGARA')
    expect(all).toContain('NUEVA RESERVA')
    expect(all).toContain('ABCD-1ENE')
    expect(all).toContain('4')
    expect(all).toContain('Maria Garcia Lopez')
    expect(all).toContain('600 123 456')
  })

  it('renders local date+time (Europe/Madrid) not UTC', () => {
    const all = buildPosTicketLines(sample).join('\n')
    expect(all).toContain('21:00')
  })

  it('transliterates accents for thermal charset safety', () => {
    const all = buildPosTicketLines(sample).join('\n')
    expect(all).not.toContain('í')
    expect(all.toUpperCase()).toContain('ZINGARA')
  })

  it('works without mesa assignment (zone-only reservation)', () => {
    const lines = buildPosTicketLines({ ...sample, mesa_num: null })
    const all = lines.join('\n')
    expect(all).toContain('Principal')
    expect(all).not.toContain('Mesa 7')
  })
})

describe('posTicketBytes', () => {
  it('starts with ESC/POS init and ends with partial cut (+feed lines)', () => {
    const bytes = posTicketBytes(buildPosTicketLines(sample))
    expect(bytes[0]).toBe(POS_INIT[0]) // ESC
    expect(bytes[1]).toBe(POS_INIT[1]) // @
    // Tail: GS V (0x1d 0x56) + cut mode 'B' + feed lines 0
    const tail = Array.from(bytes.slice(-4))
    expect(tail).toEqual([0x1d, 0x56, 0x42, 0x00])
  })
})
