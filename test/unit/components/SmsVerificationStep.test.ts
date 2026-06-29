/**
 * SmsVerificationStep.test.ts — SMS verification step tests (RF-002, RF-003)
 *
 * Tests:
 * - 4-digit code input (maxLength 4, numeric)
 * - POST /api/sms/verify on submit
 * - Emits verified on success
 * - 3-retry limit + "Demasiados intentos" message
 * - 60s resend cooldown + countdown
 * - Emits back to return to form
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SmsVerificationStep from '../../../app/components/SmsVerificationStep.vue'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('SmsVerificationStep (RF-002, RF-003)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.useRealTimers()
  })

  it('renders phone number display', () => {
    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })
    expect(wrapper.text()).toContain('+34600000000')
  })

  it('accepts 4-digit code input', async () => {
    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })
    const input = wrapper.find('input')
    await input.setValue('1234')
    expect((input.element as HTMLInputElement).value).toBe('1234')
  })

  it('has maxlength of 4 on the input (HTML attribute)', () => {
    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })
    const input = wrapper.find('input')
    expect(input.attributes('maxlength')).toBe('4')
  })

  it('emits verified on successful code verification', async () => {
    mockFetch.mockResolvedValueOnce({ valid: true })

    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    await wrapper.find('input').setValue('1234')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Check that POST was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/sms/verify', {
      method: 'POST',
      body: { phone: '+34600000000', code: '1234' },
    })

    // Emit verified
    expect(wrapper.emitted('verified')).toBeTruthy()
  })

  it('shows error on wrong code and tracks retries', async () => {
    mockFetch.mockResolvedValue({ valid: false })

    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    // Attempt 1
    await wrapper.find('input').setValue('9999')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Codigo incorrecto')
    expect(wrapper.text()).toContain('2') // remaining attempts: 2

    // Attempt 2
    await wrapper.find('input').setValue('8888')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('1') // remaining attempts: 1

    // Attempt 3 (last)
    await wrapper.find('input').setValue('7777')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('0') // remaining attempts: 0
    expect(wrapper.text()).toContain('Demasiados intentos, solicita un nuevo codigo')
  })

  it('disables verify input after 3 failed retries', async () => {
    mockFetch.mockResolvedValue({ valid: false })

    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await wrapper.find('input').setValue(String(Math.floor(1000 + Math.random() * 9000)))
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()
    }

    // Input should be disabled
    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('shows resend button with countdown', async () => {
    vi.useFakeTimers()

    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    const resendButton = wrapper.find('[data-testid="resend-button"]')
    expect(resendButton.exists()).toBe(true)
    expect(resendButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Reenviar codigo en 60s')

    // Advance 30s — should show ~30s remaining
    vi.advanceTimersByTime(30000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('30s')

    // Advance past 60s
    vi.advanceTimersByTime(31000)
    await wrapper.vm.$nextTick()
    expect(resendButton.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Reenviar codigo')

    vi.useRealTimers()
  })

  it('emits back when back button clicked', async () => {
    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    await wrapper.find('[data-testid="back-button"]').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })

  it('clears input after successful verify', async () => {
    mockFetch.mockResolvedValueOnce({ valid: true })

    const wrapper = mount(SmsVerificationStep, {
      props: { phone: '+34600000000' },
    })

    await wrapper.find('input').setValue('1234')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })
})
