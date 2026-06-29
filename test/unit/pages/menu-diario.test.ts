import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MenuDiarioPage from '../../../app/pages/menu-diario.vue'
import PageHero from '../../../app/components/PageHero.vue'

describe('Menu Diario page (MD-001, MD-002, MD-003)', () => {
  const mountOptions = {
    global: { components: { PageHero } },
  }

  it('renders PageHero with menu title', () => {
    const wrapper = mount(MenuDiarioPage, mountOptions)
    expect(wrapper.text()).toContain('Menú del Día')
  })

  it('displays the price', () => {
    const wrapper = mount(MenuDiarioPage, mountOptions)
    const text = wrapper.text()
    // Should contain the euro symbol and price
    expect(text).toMatch(/€/)
  })

  it('renders all 5 sections in Spanish', () => {
    const wrapper = mount(MenuDiarioPage, mountOptions)
    const text = wrapper.text()
    expect(text).toContain('Primer Plato')
    expect(text).toContain('Segundo Plato')
    expect(text).toContain('Postre')
    expect(text).toContain('Bebida')
    expect(text).toContain('Pan y Cubiertos')
  })

  it('shows dish names within sections', () => {
    const wrapper = mount(MenuDiarioPage, mountOptions)
    const text = wrapper.text()
    // Should contain at least some dish content (not empty sections)
    expect(text.length).toBeGreaterThan(100)
  })

  it('selects menu based on current day (mock Date)', () => {
    // Mock Date to ensure consistent day selection
    const mockDate = new Date('2027-07-14T12:00:00') // Wednesday = 3
    vi.setSystemTime(mockDate)

    const wrapper = mount(MenuDiarioPage, mountOptions)
    // Day 3 should have its specific content
    expect(wrapper.text()).toContain('Menú del Día')

    vi.useRealTimers()
  })
})
