/**
 * informe-config.test.ts — print report template config normalization
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeInformeConfig,
  DEFAULT_INFORME_CONFIG,
  INFORME_FUENTES,
  informeFontCss,
} from '../../../shared/utils/informe-config'

describe('normalizeInformeConfig', () => {
  it('returns defaults for empty/invalid raw input', () => {
    expect(normalizeInformeConfig(undefined)).toEqual(DEFAULT_INFORME_CONFIG)
    expect(normalizeInformeConfig(null)).toEqual(DEFAULT_INFORME_CONFIG)
    expect(normalizeInformeConfig('garbage')).toEqual(DEFAULT_INFORME_CONFIG)
    expect(normalizeInformeConfig(42)).toEqual(DEFAULT_INFORME_CONFIG)
  })

  it('merges partial objects with defaults', () => {
    const r = normalizeInformeConfig({ tamano: 14 })
    expect(r.fuente).toBe(DEFAULT_INFORME_CONFIG.fuente)
    expect(r.tamano).toBe(14)
    expect(r.mostrar_telefono).toBe(true)
  })

  it('clamps tamano to [8, 16]', () => {
    expect(normalizeInformeConfig({ tamano: 2 }).tamano).toBe(8)
    expect(normalizeInformeConfig({ tamano: 99 }).tamano).toBe(16)
    expect(normalizeInformeConfig({ tamano: 'x' }).tamano).toBe(DEFAULT_INFORME_CONFIG.tamano)
  })

  it('rejects unknown fuente values', () => {
    expect(normalizeInformeConfig({ fuente: 'comic-sans' }).fuente).toBe(DEFAULT_INFORME_CONFIG.fuente)
    expect(normalizeInformeConfig({ fuente: 'times' }).fuente).toBe('times')
  })

  it('coerces toggle flags to booleans', () => {
    expect(normalizeInformeConfig({ mostrar_telefono: false }).mostrar_telefono).toBe(false)
    expect(normalizeInformeConfig({ mostrar_telefono: 'yes' }).mostrar_telefono).toBe(true)
    expect(normalizeInformeConfig({ mostrar_referencia: 0 }).mostrar_referencia).toBe(false)
  })

  it('normalizes orientation (vertical/apaisado), rejects unknown values', () => {
    expect(normalizeInformeConfig({ orientacion: 'apaisado' }).orientacion).toBe('apaisado')
    expect(normalizeInformeConfig({ orientacion: 'vertical' }).orientacion).toBe('vertical')
    expect(normalizeInformeConfig({ orientacion: 'diagonal' }).orientacion).toBe('vertical')
    expect(normalizeInformeConfig(undefined).orientacion).toBe('vertical')
  })

  it('resolves report font css', () => {
    expect(informeFontCss('courier')).toContain('Courier New')
    expect(informeFontCss('times')).toContain('Times')
    expect(informeFontCss('desconocida' as any)).toBe(INFORME_FUENTES[DEFAULT_INFORME_CONFIG.fuente].css)
  })
})
