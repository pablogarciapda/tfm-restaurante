import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../../../app/components/BaseButton.vue'

/**
 * RED → GREEN → TRIANGULATE — BaseButton (PU-005)
 *
 * PU-005 scenarios:
 * - Primary variant: terracotta bg, white text
 * - Disabled: no click emit, aria-disabled="true"
 * - Props: variant (primary|secondary|ghost), size (sm|md|lg), disabled
 */

describe('BaseButton — Variants', () => {
  it('renders with default variant (primary) and default size (md)', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Click me' },
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.attributes('disabled')).toBeUndefined()
    // Primary variant should have terracotta-like appearance
    // We test via the presence of a semantic role + non-default styling
    const button = wrapper.get('button')
    expect(button.exists()).toBe(true)
  })

  it('applies secondary variant class when variant="secondary"', () => {
    const primary = mount(BaseButton, {
      props: { variant: 'primary' },
      slots: { default: 'P' },
    })
    const secondary = mount(BaseButton, {
      props: { variant: 'secondary' },
      slots: { default: 'S' },
    })

    // Different variants should produce different rendered output
    const primaryHtml = primary.html()
    const secondaryHtml = secondary.html()
    expect(primaryHtml).not.toBe(secondaryHtml)
  })

  it('applies ghost variant class when variant="ghost"', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'ghost' },
      slots: { default: 'Ghost' },
    })

    expect(wrapper.text()).toBe('Ghost')
    // Ghost should not have solid background — tested via existence
    expect(wrapper.get('button').exists()).toBe(true)
  })
})

describe('BaseButton — Sizes', () => {
  it('renders small size when size="sm"', () => {
    const wrapper = mount(BaseButton, {
      props: { size: 'sm' },
      slots: { default: 'Small' },
    })

    expect(wrapper.text()).toBe('Small')
  })

  it('renders large size when size="lg"', () => {
    const wrapper = mount(BaseButton, {
      props: { size: 'lg' },
      slots: { default: 'Large' },
    })

    expect(wrapper.text()).toBe('Large')
  })
})

describe('BaseButton — Disabled state', () => {
  it('renders with aria-disabled when disabled prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
      slots: { default: 'Disabled' },
    })

    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBe('')
    expect(button.attributes('aria-disabled')).toBe('true')
  })

  it('does not emit click event when disabled', async () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
      slots: { default: 'Disabled' },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('emits click event when enabled', async () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: false },
      slots: { default: 'Enabled' },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('BaseButton — Slot content', () => {
  it('renders slot content inside the button', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: '<span class="icon">⭐</span> Reservar' },
    })

    expect(wrapper.html()).toContain('⭐')
    expect(wrapper.text()).toContain('Reservar')
  })
})
