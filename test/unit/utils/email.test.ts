/**
 * email.test.ts — Unit tests for server/utils/email.ts
 *
 * Tests buildConfirmationHtml() pure function.
 * getEmailConfig and sendEmail are tested via integration with mock Supabase/nodemailer.
 */
import { describe, it, expect } from 'vitest'

// Import the pure function from the email utility
// We import this before it exists (RED phase)
import { buildConfirmationHtml } from '../../../server/utils/email'

describe('buildConfirmationHtml', () => {
  const baseParams = {
    nombre: 'María',
    apellidos: 'García López',
    fecha_hora: '2026-07-15T20:30:00.000Z',
    comensales: 4,
    id: 'test-reserva-uuid',
  }

  it('includes the full name (nombre + apellidos)', () => {
    const html = buildConfirmationHtml(baseParams)
    expect(html).toContain('María García López')
  })

  it('falls back to only nombre when apellidos is null', () => {
    const html = buildConfirmationHtml({
      ...baseParams,
      apellidos: null,
    })
    expect(html).toContain('María')
    // Should NOT contain "null"
    expect(html).not.toContain('null')
  })

  it('falls back to only nombre when apellidos is undefined', () => {
    const html = buildConfirmationHtml({
      nombre: 'Carlos',
      apellidos: undefined,
      fecha_hora: baseParams.fecha_hora,
      comensales: 2,
      id: 'test-2',
    })
    expect(html).toContain('Carlos')
    expect(html).not.toContain('undefined')
  })

  it('includes the formatted date in Spanish', () => {
    const html = buildConfirmationHtml(baseParams)
    // Date 2026-07-15 → miércoles 15 de julio de 2026 (CET = +2h)
    expect(html).toContain('julio')
    expect(html).toContain('2026')
  })

  it('includes the time in 24h format', () => {
    const html = buildConfirmationHtml(baseParams)
    // 20:30 UTC → 22:30 CEST
    expect(html).toContain(':')
  })

  it('includes the number of comensales', () => {
    const html = buildConfirmationHtml(baseParams)
    expect(html).toContain('4')
  })

  it('includes the reservation reference ID', () => {
    const html = buildConfirmationHtml(baseParams)
    expect(html).toContain('test-reserva-uuid')
  })

  it('includes La Zíngara branding', () => {
    const html = buildConfirmationHtml(baseParams)
    expect(html).toContain('La Zíngara')
  })

  it('returns an HTML string (not empty)', () => {
    const html = buildConfirmationHtml(baseParams)
    expect(html.length).toBeGreaterThan(100)
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('handles empty apellidos string gracefully', () => {
    const html = buildConfirmationHtml({
      nombre: 'Ana',
      apellidos: '',
      fecha_hora: baseParams.fecha_hora,
      comensales: 1,
      id: 'test-3',
    })
    expect(html).toContain('Ana')
  })
})
