/**
 * reservas.test.ts — Reservas page multi-step flow tests (RF-001–RF-005)
 *
 * Tests:
 * - PageHero title "Reservas"
 * - Step 1: ReservationForm visible initially
 * - Step 2: SmsVerificationStep after form submit (mock POST /api/sms/send)
 * - Step 3: Confirmation after SMS verified (mock POST /api/reservas)
 * - "Elegir mesa" button disabled with "Proximamente" title
 * - Can go back from step 2 to step 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReservasPage from '../../../app/pages/reservas.vue'
import ReservationForm from '../../../app/components/ReservationForm.vue'
import SmsVerificationStep from '../../../app/components/SmsVerificationStep.vue'
import PageHero from '../../../app/components/PageHero.vue'

// $fetch is a Nuxt auto-import that resolves to ofetch's $fetch in compiled code.
// In unit tests with @vitejs/plugin-vue (no Nuxt), $fetch is undefined in module scope.
// We MUST set it on globalThis BEFORE importing any component that uses it.
// However, since Vitest hoists imports, we use vi.stubGlobal before each mount.

describe('reservas.vue multi-step flow (RF-001–RF-005)', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    // Stub global $fetch (Nuxt auto-import resolves to ofetch's global $fetch in runtime)
    vi.stubGlobal('$fetch', mockFetch)
  })

  function mountPage() {
    return mount(ReservasPage, {
      global: {
        components: {
          PageHero,
          ReservationForm,
          SmsVerificationStep,
        },
      },
    })
  }

  it('renders PageHero with title "Reservas"', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Reservas')
  })

  it('shows ReservationForm on step 1', () => {
    const wrapper = mountPage()
    expect(wrapper.findComponent(ReservationForm).exists()).toBe(true)
  })

  it('transitions to step 2 (SMS verify) on form submit', async () => {
    mockFetch.mockResolvedValueOnce({ success: true })

    const wrapper = mountPage()

    // Fill form and submit
    await wrapper.find('#nombre').setValue('Maria')
    await wrapper.find('#telefono').setValue('+34600000000')
    await wrapper.find('#email').setValue('maria@test.com')
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16)
    await wrapper.find('#fecha_hora').setValue(futureDate)
    await wrapper.find('#numero_comensales').setValue(4)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Check POST was made
    expect(mockFetch).toHaveBeenCalledWith('/api/sms/send', {
      method: 'POST',
      body: { phone: '+34600000000' },
    })

    // Step 2 should be visible
    expect(wrapper.findComponent(SmsVerificationStep).exists()).toBe(true)
  })

  it('transitions to step 3 (confirmation) on SMS verified', async () => {
    mockFetch
      .mockResolvedValueOnce({ success: true }) // sms send
      .mockResolvedValueOnce({ success: true, id: 'mock-123' }) // reservas submit

    const wrapper = mountPage()

    // Step 1 → Step 2: fill form and submit
    await wrapper.find('#nombre').setValue('Maria')
    await wrapper.find('#telefono').setValue('+34600000000')
    await wrapper.find('#email').setValue('maria@test.com')
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16)
    await wrapper.find('#fecha_hora').setValue(futureDate)
    await wrapper.find('#numero_comensales').setValue(4)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Step 2 → Step 3: trigger verified via emit on the SmsVerificationStep
    const smsStep = wrapper.findComponent(SmsVerificationStep)
    await smsStep.vm.$emit('verified')
    await flushPromises()

    // Check reservas POST was made
    expect(mockFetch).toHaveBeenCalledWith('/api/reservas', expect.objectContaining({
      method: 'POST',
    }))

    // Step 3: confirmation
    expect(wrapper.text()).toContain('Reserva confirmada')
  })

  it('shows "Elegir mesa" button disabled with "Proximamente" title', () => {
    const wrapper = mountPage()
    const button = wrapper.find('[data-testid="elegir-mesa-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toBe('Proximamente')
  })

  it('can go back from step 2 to step 1', async () => {
    mockFetch.mockResolvedValueOnce({ success: true })

    const wrapper = mountPage()

    // Advance to step 2
    await wrapper.find('#nombre').setValue('Maria')
    await wrapper.find('#telefono').setValue('+34600000000')
    await wrapper.find('#email').setValue('maria@test.com')
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16)
    await wrapper.find('#fecha_hora').setValue(futureDate)
    await wrapper.find('#numero_comensales').setValue(4)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.findComponent(SmsVerificationStep).exists()).toBe(true)

    // Go back via emit on the sms step component
    const smsStep = wrapper.findComponent(SmsVerificationStep)
    await smsStep.vm.$emit('back')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ReservationForm).exists()).toBe(true)
  })
})
