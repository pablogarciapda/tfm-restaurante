/**
 * slots.test.ts — Slot generation integration tests (HOR-003)
 *
 * Tests the generateSlots utility from shared/utils/slots.ts
 * covering lunch, dinner, boundary cases, and different intervals.
 * This is auto-imported in Nuxt but tested directly here as a pure function.
 */
import { describe, it, expect } from 'vitest'
import { generateSlots, generateTurnSlots, isSlotInRange } from '../../../shared/utils/slots'

describe('generateTurnSlots', () => {
  it('generates correct number of slots for 15-min interval', () => {
    const slots = generateTurnSlots('13:30', '15:30', 15)
    // 13:30 to 15:30 in 15-min steps: 13:30, 13:45, 14:00, 14:15, 14:30, 14:45, 15:00, 15:15, 15:30 = 9 slots
    expect(slots.length).toBe(9)
    expect(slots[0]!.hora).toBe('13:30')
    expect(slots[8]!.hora).toBe('15:30')
  })

  it('generates correct number of slots for 30-min interval', () => {
    const slots = generateTurnSlots('13:30', '15:30', 30)
    // 13:30, 14:00, 14:30, 15:00, 15:30 = 5 slots
    expect(slots.length).toBe(5)
    expect(slots[0]!.hora).toBe('13:30')
    expect(slots[4]!.hora).toBe('15:30')
  })

  it('generates correct number of slots for 60-min interval', () => {
    const slots = generateTurnSlots('21:00', '23:30', 60)
    // 21:00, 22:00, 23:00 = 3 slots (23:00 < 23:30)
    expect(slots.length).toBe(3)
  })

  it('includes end time when aligned with interval', () => {
    const slots = generateTurnSlots('13:00', '14:00', 30)
    // 13:00, 13:30, 14:00 (14:00 included when aligned)
    expect(slots.length).toBe(3)
    expect(slots.map((s) => s.hora)).toEqual(['13:00', '13:30', '14:00'])
  })

  it('returns empty array when start >= end', () => {
    const slots = generateTurnSlots('15:00', '13:00', 15)
    expect(slots.length).toBe(0)
  })
})

describe('generateSlots', () => {
  const config = {
    comida_inicio: '13:30',
    comida_fin: '15:30',
    cena_inicio: '21:00',
    cena_fin: '23:30',
    intervalo_minutos: 15,
  }

  it('combines lunch and dinner slots', () => {
    const slots = generateSlots(config)
    // 9 lunch + 11 dinner = 20 (inclusive end boundaries)
    expect(slots.length).toBe(20)
  })

  it('orders lunch slots first, then dinner', () => {
    const slots = generateSlots(config)
    expect(slots[0]!.hora).toBe('13:30')
    expect(slots[8]!.hora).toBe('15:30') // last lunch
    expect(slots[9]!.hora).toBe('21:00') // first dinner
    expect(slots[19]!.hora).toBe('23:30') // last dinner
  })

  it('works with 30-min interval', () => {
    const slots = generateSlots({ ...config, intervalo_minutos: 30 })
    // 5 lunch + 6 dinner = 11 (inclusive end boundaries)
    expect(slots.length).toBe(11)
  })

  it('all slots are in HH:MM format', () => {
    const slots = generateSlots(config)
    for (const slot of slots) {
      expect(slot.hora).toMatch(/^\d{2}:\d{2}$/)
    }
  })
})

describe('isSlotInRange', () => {
  const config = {
    comida_inicio: '13:30',
    comida_fin: '15:30',
    cena_inicio: '21:00',
    cena_fin: '23:30',
    intervalo_minutos: 15,
  }

  it('accepts valid lunch slot', () => {
    expect(isSlotInRange('13:30', config)).toBe(true)
    expect(isSlotInRange('14:00', config)).toBe(true)
    expect(isSlotInRange('15:15', config)).toBe(true)
  })

  it('accepts valid dinner slot', () => {
    expect(isSlotInRange('21:00', config)).toBe(true)
    expect(isSlotInRange('22:15', config)).toBe(true)
    expect(isSlotInRange('23:15', config)).toBe(true)
  })

  it('rejects times outside lunch and dinner ranges', () => {
    expect(isSlotInRange('16:00', config)).toBe(false)
    expect(isSlotInRange('20:30', config)).toBe(false)
    expect(isSlotInRange('00:00', config)).toBe(false)
  })

  it('rejects times that are not at interval boundaries', () => {
    expect(isSlotInRange('13:37', config)).toBe(false)
    expect(isSlotInRange('14:07', config)).toBe(false)
  })

  it('accepts times within ±5 minute tolerance', () => {
    expect(isSlotInRange('13:32', config)).toBe(true)
    expect(isSlotInRange('14:03', config)).toBe(true)
    expect(isSlotInRange('21:02', config)).toBe(true)
  })
})
