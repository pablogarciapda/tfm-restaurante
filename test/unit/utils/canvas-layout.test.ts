import { describe, expect, it } from 'vitest'
import { isCanvasDate, isCanvasTurno } from '#shared/utils/canvas-layout'

describe('canvas layout input validation', () => {
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isCanvasDate('2026-08-11')).toBe(true)
    expect(isCanvasDate('2026-02-30')).toBe(false)
    expect(isCanvasDate('11/08/2026')).toBe(false)
  })

  it('accepts only comida and cena', () => {
    expect(isCanvasTurno('comida')).toBe(true)
    expect(isCanvasTurno('cena')).toBe(true)
    expect(isCanvasTurno('noche')).toBe(false)
  })
})
