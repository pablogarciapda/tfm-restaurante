/**
 * email.test.ts — Unit tests for server/utils/email.ts
 *
 * Tests buildConfirmationHtml() pure function.
 * getEmailConfig and sendEmail are tested via integration with mock Supabase/nodemailer.
 */
import { describe, it, expect } from 'vitest'

// Import the pure function from the email utility
// We import this before it exists (RED phase)
import { buildConfirmationHtml, buildCancellationHtml } from '../../../server/utils/email'
import { TEST_RESTAURANT } from '../../__fixtures__/restaurant-config'

const defaultRestaurant = {
  ...TEST_RESTAURANT,
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

  it('includes restaurant branding from config', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain(TEST_RESTAURANT.nombre)
  })

  it('includes the restaurant address from config', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('Calle Test')
    expect(html).toContain(TEST_RESTAURANT.poblacion)
  })

  it('includes the Google Maps link', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('Google Maps')
    expect(html).toContain(defaultRestaurant.maps_url)
  })

  it('includes the restaurant phone number', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).toContain(TEST_RESTAURANT.telefono)
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

  it('includes mesa info when mesa_numero is provided', () => {
    const html = buildConfirmationHtml(
      {
        ...baseParams,
        mesa_numero: 7,
        mesa_zona: 'Principal',
      },
      defaultRestaurant,
    )
    expect(html).toContain('Mesa 7')
    expect(html).toContain('Principal')
  })

  it('omits mesa section when mesa_numero is not provided', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).not.toContain('Mesa ')
  })

  it('includes cancel link when cancel_token is provided', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, cancel_token: 'abc-123-def' },
      defaultRestaurant,
    )
    expect(html).toContain('cancelar?token=abc-123-def')
    expect(html).toContain('Cancelar reserva')
  })

  it('omits cancel link when cancel_token is not provided', () => {
    const html = buildConfirmationHtml(baseParams, defaultRestaurant)
    expect(html).not.toContain('cancelar?token=')
  })

  it('omits cancel link when cancel_token is null', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, cancel_token: null },
      defaultRestaurant,
    )
    expect(html).not.toContain('cancelar?token=')
  })

  it('uses configuracion.site_url (trailing slash stripped, no hardcoded fallback)', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, cancel_token: 'tok-1' },
      { ...defaultRestaurant, site_url: 'http://57.131.33.90:3000/' },
    )
    expect(html).toContain('http://57.131.33.90:3000/cancelar?token=tok-1')
    expect(html).not.toContain('57.131.33.90:3000//cancelar')
    expect(html).not.toContain('test-restaurant.com')
  })

  it('does NOT leak the configured site_url when site_url is empty', () => {
    const html = buildConfirmationHtml(
      { ...baseParams, cancel_token: 'tok-2' },
      { ...defaultRestaurant, site_url: '' },
    )
    expect(html).not.toContain(TEST_RESTAURANT.site_url)
    expect(html).not.toContain('test-restaurant.com/cancelar')
  })
})

describe('buildCancellationHtml', () => {
  const baseParams = {
    nombre: 'María',
    apellidos: 'García López',
    email: 'maria@test.com',
    fecha_hora: '2026-07-15T20:30:00.000Z',
    comensales: 4,
  }

  it('includes the full name', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('María García López')
  })

  it('includes "Reserva cancelada" heading', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('Reserva cancelada')
  })

  it('includes the formatted date in Spanish', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('julio')
    expect(html).toContain('2026')
  })

  it('includes the number of comensales', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('4')
  })

  it('includes the restaurant info', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain(TEST_RESTAURANT.nombre)
    expect(html).toContain('Calle Test')
    expect(html).toContain(TEST_RESTAURANT.telefono)
  })

  it('includes referencia when provided', () => {
    const html = buildCancellationHtml(
      { ...baseParams, referencia: 'LN4F-28JUN' },
      defaultRestaurant,
    )
    expect(html).toContain('LN4F-28JUN')
  })

  it('omits referencia section when not provided', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).not.toContain('LN4F')
  })

  it('falls back to only nombre when apellidos is null', () => {
    const html = buildCancellationHtml(
      { ...baseParams, apellidos: null },
      defaultRestaurant,
    )
    expect(html).toContain('María')
    expect(html).not.toContain('null')
  })

  it('returns an HTML string', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html.length).toBeGreaterThan(100)
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('includes contact instructions for mistaken cancellation', () => {
    const html = buildCancellationHtml(baseParams, defaultRestaurant)
    expect(html).toContain('no solicitaste esta cancelación')
    expect(html).toContain(TEST_RESTAURANT.telefono)
  })
})
