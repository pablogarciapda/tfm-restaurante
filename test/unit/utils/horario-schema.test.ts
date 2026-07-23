import { describe, it, expect } from 'vitest'
import { horarioConfigSchema } from '../../../server/utils/validation'

const makeDias = () => [
  { dia: 'lunes', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'martes', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'miércoles', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'jueves', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'viernes', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'sábado', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
  { dia: 'domingo', apertura: '09:00', cierre: '23:00', descanso: false, vacaciones: false },
]

const makeHorario = (overrides = {}) => ({
  comida_inicio: '13:30',
  comida_fin: '15:30',
  cena_inicio: '21:00',
  cena_fin: '23:30',
  intervalo_minutos: 15,
  mostrar_horario_cocina: true,
  establecimiento: { mostrar_en_contacto: true, dias: makeDias() },
  ...overrides,
})

describe('horarioConfigSchema with establecimiento', () => {
  it('validates with ALL fields including establecimiento', () => {
    const result = horarioConfigSchema.safeParse(makeHorario())
    expect(result.success).toBe(true)
  })

  it('validates without establecimiento (optional)', () => {
    const data = makeHorario()
    delete data.establecimiento
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects when dias has 6 items instead of 7', () => {
    const data = makeHorario()
    data.establecimiento!.dias = data.establecimiento!.dias.slice(0, 6)
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects when apertura time is invalid format', () => {
    const data = makeHorario()
    data.establecimiento!.dias[0]!.apertura = '9:00' // wrong format
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('allows apertura > cierre (ej: cierra a las 02:00 del día siguiente)', () => {
    const data = makeHorario()
    data.establecimiento!.dias[0]!.apertura = '09:00'
    data.establecimiento!.dias[0]!.cierre = '02:00'
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('allows descanso=true without breaking time validation', () => {
    const data = makeHorario()
    data.establecimiento!.dias[0]!.descanso = true
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('allows vacaciones=true without breaking time validation', () => {
    const data = makeHorario()
    data.establecimiento!.dias[0]!.vacaciones = true
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('mostrar_horario_cocina defaults to true', () => {
    const data = makeHorario()
    delete data.mostrar_horario_cocina
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mostrar_horario_cocina).toBe(true)
    }
  })

  it('rejects when comida_inicio >= comida_fin', () => {
    const data = makeHorario({ comida_inicio: '15:30', comida_fin: '13:30' })
    const result = horarioConfigSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})