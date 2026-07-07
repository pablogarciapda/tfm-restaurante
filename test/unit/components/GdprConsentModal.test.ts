/**
 * GdprConsentModal.test.ts — GDPR consent modal tests (GDPR-001)
 *
 * Tests:
 * - Renders text content
 * - Accept button disabled until scrolled to bottom
 * - Reject button always enabled
 * - Accept/reject emits
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GdprConsentModal from '../../../app/components/GdprConsentModal.vue'

const SAMPLE_TEXT = 'Este es el texto de protección de datos. '.repeat(20)

describe('GdprConsentModal', () => {
  it('renders the GDPR text', () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    expect(wrapper.text()).toContain('protección')
  })

  it('shows modal when show=true', () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    expect(wrapper.find('[data-testid="gdpr-modal"]').exists()).toBe(true)
  })

  it('does not display when show=false', () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: false, text: SAMPLE_TEXT },
    })

    expect(wrapper.find('[data-testid="gdpr-modal"]').exists()).toBe(false)
  })

  it('accept button is initially disabled', () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    const acceptBtn = wrapper.find('[data-testid="gdpr-accept"]')
    expect(acceptBtn.attributes('disabled')).toBeDefined()
  })

  it('accept button enables after scrolling to bottom', async () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    // Simulate scroll to bottom
    const scrollContainer = wrapper.find('[data-testid="gdpr-scroll-container"]')
    Object.defineProperty(scrollContainer.element, 'scrollTop', { value: 500, writable: true })
    Object.defineProperty(scrollContainer.element, 'scrollHeight', { value: 550, writable: true })
    Object.defineProperty(scrollContainer.element, 'clientHeight', { value: 50, writable: true })

    await scrollContainer.trigger('scroll')

    const acceptBtn = wrapper.find('[data-testid="gdpr-accept"]')
    expect(acceptBtn.attributes('disabled')).toBeUndefined()
  })

  it('accept button stays disabled when not scrolled to bottom', async () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    const scrollContainer = wrapper.find('[data-testid="gdpr-scroll-container"]')
    // scrollTop=0, large scrollHeight → NOT at bottom
    Object.defineProperty(scrollContainer.element, 'scrollTop', { value: 0, writable: true })
    Object.defineProperty(scrollContainer.element, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(scrollContainer.element, 'clientHeight', { value: 200, writable: true })

    await scrollContainer.trigger('scroll')

    const acceptBtn = wrapper.find('[data-testid="gdpr-accept"]')
    expect(acceptBtn.attributes('disabled')).toBeDefined()
  })

  it('emits accept when accept button is clicked', async () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    // Enable by simulating scroll to bottom
    const scrollContainer = wrapper.find('[data-testid="gdpr-scroll-container"]')
    Object.defineProperty(scrollContainer.element, 'scrollTop', { value: 500, writable: true })
    Object.defineProperty(scrollContainer.element, 'scrollHeight', { value: 550, writable: true })
    Object.defineProperty(scrollContainer.element, 'clientHeight', { value: 50, writable: true })
    await scrollContainer.trigger('scroll')

    await wrapper.find('[data-testid="gdpr-accept"]').trigger('click')

    expect(wrapper.emitted('accept')).toBeTruthy()
    expect(wrapper.emitted('accept')!.length).toBe(1)
  })

  it('emits reject when reject button is clicked', async () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    await wrapper.find('[data-testid="gdpr-reject"]').trigger('click')

    expect(wrapper.emitted('reject')).toBeTruthy()
    expect(wrapper.emitted('reject')!.length).toBe(1)
  })

  it('reject button is enabled even without scrolling', () => {
    const wrapper = mount(GdprConsentModal, {
      props: { show: true, text: SAMPLE_TEXT },
    })

    const rejectBtn = wrapper.find('[data-testid="gdpr-reject"]')
    expect(rejectBtn.attributes('disabled')).toBeUndefined()
  })
})
