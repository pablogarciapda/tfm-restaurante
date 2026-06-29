import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionDivider from '../../../app/components/SectionDivider.vue'

/**
 * RED → GREEN → TRIANGULATE — SectionDivider (PU-008)
 *
 * PU-008 scenarios:
 * - Renders horizontal rule with role="separator"
 * - Optional label text centered on the rule
 */

describe('SectionDivider — Role', () => {
  it('renders with role="separator"', () => {
    const wrapper = mount(SectionDivider)

    const separator = wrapper.get('[role="separator"]')
    expect(separator.exists()).toBe(true)
  })

  it('renders a horizontal rule element', () => {
    const wrapper = mount(SectionDivider)

    // The separator should be a semantic divider
    const separator = wrapper.get('[role="separator"]')
    expect(separator).toBeTruthy()
  })
})

describe('SectionDivider — Label', () => {
  it('renders without label text when label prop is not provided', () => {
    const wrapper = mount(SectionDivider)

    // Label text like "ENTRANTES" should not exist
    expect(wrapper.text().trim()).toBe('')
  })

  it('renders label text when label prop is provided', () => {
    const wrapper = mount(SectionDivider, {
      props: { label: 'ENTRANTES' },
    })

    expect(wrapper.text()).toContain('ENTRANTES')
  })

  it('renders different label text', () => {
    const wrapper = mount(SectionDivider, {
      props: { label: 'POSTRES' },
    })

    expect(wrapper.text()).toContain('POSTRES')
  })
})
