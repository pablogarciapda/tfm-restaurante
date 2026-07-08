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

const defaultRestaurant = {
  nombre: 'La Zíngara',
  direccion: 'Plaza Mayor, 1, 24250 Santa María del Páramo, León',
  telefono: '987 123 456',
  maps_url: 'https://maps.google.com/?q=La+Zíngara+Santa+María+del+Páramo',
}

describe('buildConfirmationHtml', () => {
  const baseParams = {
    nombre: 'María',
    apellidos: 'García López',
    fecha_hora: '2026-07-15T20:30:00.000Z',
    comensales: 4,
    id: 'test-reserva-uuid',
  }

  it('includes the full name (nombre + apellidos)', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('María García López')
  })

  it('falls back to only nombre when apellidos is null', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, apellidos: null },
      defaultRestaurant,
    )
    expect(html).toContain('María')
    expect(html).not.toContain('null')
  })

  it('falls back to only nombre when apellidos is undefined', () => {
    const html = buildConfirmationHtml(
      {
        nombre: 'Carlos',
        apellidos: undefined,
        fecha_hora: baseParams.fecha_hora,
        comensales: 2,
        id: 'test-2',
      },
      defaultRestaurant,
    )
    expect(html).toContain('Carlos')
    expect(html).not.toContain('undefined')
  })

  it('includes the formatted date in Spanish', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('julio')
    expect(html).toContain('2026')
  })

  it('includes the time in 24h format', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain(':')
  })

  it('includes the number of comensales', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('4')
  })

  it('includes the reservation reference ID (falls back to UUID)', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('test-reserva-uuid')
    expect(html).not.toContain('LN4F')
  })

  it('uses human-readable referencia when provided', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, referencia: 'LN4F-28JUN' },
      defaultRestaurant,
    )
    expect(html).toContain('LN4F-28JUN')
    expect(html).not.toContain('test-reserva-uuid')
  })

  it('includes La Zíngara branding', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('La Zíngara')
  })

  it('includes the restaurant address from config', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('Plaza Mayor')
    expect(html).toContain('Santa María del Páramo')
  })

  it('includes the Google Maps link', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('Google Maps')
    expect(html).toContain(defaultRestaurant.maps_url)
  })

  it('includes the restaurant phone number', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('987 123 456')
  })

  it('returns an HTML string (not empty)', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html.length).toBeGreaterThan(100)
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('handles empty apellidos string gracefully', () => {
    const html = buildConfirmationHtml(
      {
        nombre: 'Ana',
        apellidos: '',
        fecha_hora: baseParams.fecha_hora,
        comensales: 1,
        id: 'test-3',
      },
      defaultRestaurant,
    )
    expect(html).toContain('Ana')
  })
})
