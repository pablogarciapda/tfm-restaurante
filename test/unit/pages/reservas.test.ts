/**
 * reservas.test.ts — Reservas page multi-step flow tests (RF-001–RF-005, SLA-001–SLA-006)
 *
 * Tests:
 * - PageHero title "Reservas"
 * - Fetches /api/public-config on mount (replaces /api/config)
 * - Fetches /api/dias-bloqueados on mount
 * - Step 1: ReservationForm visible initially
 * - Step 2 (GDPR): GdprConsentModal shown when texto_proteccion_datos configured
 * - Step 3 (SMS): SmsVerificationStep after form/GDPR (only in verificada mode)
 * - Step 4 (confirmation): After SMS verified (mock POST /api/reservas)
 * - "Elegir mesa" button: enabled when cliente_elige_zona === 'zona_mesa'
 * - Can go back from SMS step to form
 * - GDPR is checked before showing the modal (already accepted = skip)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReservasPage from '../../../app/pages/reservas.vue'
import ReservationForm from '../../../app/components/ReservationForm.vue'
import SmsVerificationStep from '../../../app/components/SmsVerificationStep.vue'
import GdprConsentModal from '../../../app/components/GdprConsentModal.vue'
import PageHero from '../../../app/components/PageHero.vue'

describe('reservas.vue multi-step flow (RF-001–RF-005 + SLA)', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('$fetch', mockFetch)
  })

  function mountPage() {
    return mount(ReservasPage, {
      global: {
        components: {
          PageHero,
          ReservationForm,
          SmsVerificationStep,
          GdprConsentModal,
        },
      },
    })
  }

  it('renders PageHero with title "Reservas"', async () => {
    // Mock public-config and dias-bloqueados
    mockFetch.mockResolvedValueOnce({ horarios: null, zonas: [], cliente_elige_zona: 'none', texto_proteccion_datos: null })
    mockFetch.mockResolvedValueOnce([])

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Reservas')
  })

  it('shows ReservationForm on step 1', async () => {
    mockFetch.mockResolvedValueOnce({ horarios: null, zonas: [], cliente_elige_zona: 'none', texto_proteccion_datos: null })
    mockFetch.mockResolvedValueOnce([])

    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.findComponent(ReservationForm).exists()).toBe(true)
  })

  it('submits directly in automatica mode without GDPR (no SMS step)', async () => {
    // public-config + dias-bloqueados + reservas POST
    mockFetch
      .mockResolvedValueOnce({ horarios: null, zonas: [], cliente_elige_zona: 'none', texto_proteccion_datos: null })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: true, reserva_id: 'auto-123', estado: 'confirmada' })

    const wrapper = mountPage()
    await flushPromises()

    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!

    await form.vm.$emit('submit', {
      nombre: 'Maria',
      telefono: '612345678',
      email: 'maria@test.com',
      fecha_hora: `${dateStr}T13:30:00`,
      numero_comensales: 4,
    })
    await flushPromises()

    // No SMS call was made — direct POST to /api/reservas
    expect(mockFetch).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({
      method: 'POST',
    }))
    expect(mockFetch).not.toHaveBeenCalledWith('/api/sms/send', expect.anything())
    expect(wrapper.text()).toContain('Reserva confirmada')
  })

  it('shows GDPR modal then submits when user accepts (automatica + GDPR)', async () => {
    // public-config (with GDPR text) + dias-bloqueados + gdpr-status check + reservas POST
    mockFetch
      .mockResolvedValueOnce({
        horarios: null, zonas: [], cliente_elige_zona: 'none',
        texto_proteccion_datos: 'Texto GDPR de prueba',
        modo_reserva: 'automatica',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ gdpr_aceptado: false })
      .mockResolvedValueOnce({ success: true, reserva_id: 'gdpr-456', estado: 'confirmada' })

    const wrapper = mountPage()
    await flushPromises()

    // Step 1: submit form
    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!

    await form.vm.$emit('submit', {
      nombre: 'Carlos',
      telefono: '600111222',
      email: 'carlos@test.com',
      fecha_hora: `${dateStr}T14:00:00`,
      numero_comensales: 2,
    })
    await flushPromises()

    // GDPR modal should be visible
    const modal = wrapper.findComponent(GdprConsentModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props('show')).toBe(true)

    // Accept GDPR
    await modal.vm.$emit('accept')
    await flushPromises()

    // Reservation submitted
    expect(mockFetch).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({
      method: 'POST',
    }))
    expect(wrapper.text()).toContain('Reserva confirmada')
  })

  it('skips GDPR when user has already accepted', async () => {
    // public-config (with GDPR text) + dias-bloqueados + gdpr-status=true + reservas POST
    mockFetch
      .mockResolvedValueOnce({
        horarios: null, zonas: [], cliente_elige_zona: 'none',
        texto_proteccion_datos: 'Texto GDPR',
        modo_reserva: 'automatica',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ gdpr_aceptado: true })
      .mockResolvedValueOnce({ success: true, reserva_id: 'skip-gdpr-789', estado: 'confirmada' })

    const wrapper = mountPage()
    await flushPromises()

    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!

    await form.vm.$emit('submit', {
      nombre: 'Ana',
      telefono: '600333444',
      email: 'ana@test.com',
      fecha_hora: `${dateStr}T13:30:00`,
      numero_comensales: 3,
    })
    await flushPromises()

    // GDPR check was made, but the modal should NOT show
    expect(mockFetch).toHaveBeenCalledWith('/api/clientes/gdpr-status', expect.anything())
    const modal = wrapper.findComponent(GdprConsentModal)
    expect(modal.props('show')).toBe(false)

    // Reservation submitted directly
    expect(mockFetch).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({
      method: 'POST',
    }))
    expect(wrapper.text()).toContain('Reserva confirmada')
  })

  it('transitions to SMS step in verificada mode', async () => {
    // public-config (verificada mode) + dias-bloqueados + sms send
    mockFetch
      .mockResolvedValueOnce({
        horarios: null, zonas: [], cliente_elige_zona: 'none',
        texto_proteccion_datos: null,
        modo_reserva: 'verificada',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: true })

    const wrapper = mountPage()
    await flushPromises()

    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!

    await form.vm.$emit('submit', {
      nombre: 'Maria',
      telefono: '612345678',
      email: 'maria@test.com',
      fecha_hora: `${dateStr}T13:30:00`,
      numero_comensales: 4,
    })
    await flushPromises()

    // Check SMS was sent
    expect(mockFetch).toHaveBeenCalledWith('/api/sms/send', expect.objectContaining({
      method: 'POST',
    }))
    // SMS step should be visible
    expect(wrapper.findComponent(SmsVerificationStep).exists()).toBe(true)
  })

  it('can go back from SMS step to form', async () => {
    mockFetch
      .mockResolvedValueOnce({
        horarios: null, zonas: [], cliente_elige_zona: 'none',
        texto_proteccion_datos: null,
        modo_reserva: 'verificada',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: true })

    const wrapper = mountPage()
    await flushPromises()

    // Advance past form to SMS
    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!
    await form.vm.$emit('submit', {
      nombre: 'Maria',
      telefono: '612345678',
      email: 'maria@test.com',
      fecha_hora: `${dateStr}T13:30:00`,
      numero_comensales: 4,
    })
    await flushPromises()

    expect(wrapper.findComponent(SmsVerificationStep).exists()).toBe(true)

    // Go back via emit on the sms step component
    const smsStep = wrapper.findComponent(SmsVerificationStep)
    await smsStep.vm.$emit('back')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ReservationForm).exists()).toBe(true)
  })

  it('shows "Elegir mesa" button disabled when cliente_elige_zona is "none"', async () => {
    mockFetch.mockResolvedValueOnce({ horarios: null, zonas: [], cliente_elige_zona: 'none', texto_proteccion_datos: null })
    mockFetch.mockResolvedValueOnce([])

    const wrapper = mountPage()
    await flushPromises()

    const button = wrapper.find('[data-testid="elegir-mesa-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toBe('Próximamente')
  })

  it('shows "Elegir mesa" button enabled when cliente_elige_zona is "zona_mesa"', async () => {
    mockFetch.mockResolvedValueOnce({ horarios: null, zonas: [], cliente_elige_zona: 'zona_mesa', texto_proteccion_datos: null })
    mockFetch.mockResolvedValueOnce([])

    const wrapper = mountPage()
    await flushPromises()

    const button = wrapper.find('[data-testid="elegir-mesa-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('title')).toBe('Elegir mesa del plano')
  })

  it('shows confirmation after SMS verified', async () => {
    // public-config (verificada) + dias-bloqueados + sms send + reservas POST
    mockFetch
      .mockResolvedValueOnce({
        horarios: null, zonas: [], cliente_elige_zona: 'none',
        texto_proteccion_datos: null,
        modo_reserva: 'verificada',
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true, reserva_id: 'mock-123', estado: 'confirmada' })

    const wrapper = mountPage()
    await flushPromises()

    // Emit submit from form
    const form = wrapper.findComponent(ReservationForm)
    const futureDate = new Date(Date.now() + 86400000 * 3)
    const dateStr = futureDate.toISOString().split('T')[0]!
    await form.vm.$emit('submit', {
      nombre: 'Maria',
      telefono: '612345678',
      email: 'maria@test.com',
      fecha_hora: `${dateStr}T13:30:00`,
      numero_comensales: 4,
    })
    await flushPromises()

    // SMS verified -> confirmation
    const smsStep = wrapper.findComponent(SmsVerificationStep)
    await smsStep.vm.$emit('verified')
    await flushPromises()

    // Check reservas POST was made
    expect(mockFetch).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({
      method: 'POST',
    }))

    // Step 4: confirmation
    expect(wrapper.text()).toContain('Reserva confirmada')
  })

  it('passes horariosConfig, zonas, elige_zona, and blocked dates to ReservationForm', async () => {
    const horarios = {
      comida_inicio: '13:30', comida_fin: '15:30',
      cena_inicio: '21:00', cena_fin: '23:30',
      intervalo_minutos: 15,
    }
    const zonas = [{ id: 'principal', nombre: 'Principal', capacidad: 70, enabled: true }]

    mockFetch.mockResolvedValueOnce({
      horarios,
      zonas,
      cliente_elige_zona: 'zona',
      texto_proteccion_datos: null,
    })
    mockFetch.mockResolvedValueOnce([{ id: '1', fecha: '2026-12-25', recurrente: true, motivo: 'Navidad', created_at: '2026-01-01' }])

    const wrapper = mountPage()
    await flushPromises()

    const form = wrapper.findComponent(ReservationForm)
    expect(form.props('horariosConfig')).toEqual(horarios)
    expect(form.props('zonas')).toEqual(zonas)
    expect(form.props('clienteEligeZona')).toBe('zona')
    expect(form.props('diasBloqueados').length).toBeGreaterThan(0)
  })
})
