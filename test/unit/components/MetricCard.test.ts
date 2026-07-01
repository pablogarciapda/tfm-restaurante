/**
 * TDD: RED → GREEN → TRIANGULATE — MetricCard component (DASH-001)
 *
 * Simple card: label + value + loading state. Props: label, value, loading, icon.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const g = globalThis as Record<string, unknown>
g.defineNuxtRouteMiddleware = (fn: Function) => fn

describe('MetricCard (DASH-001)', () => {
  async function mountCard(props: Record<string, unknown>) {
    const page = await import('../../../app/components/MetricCard.vue')
    return mount(page.default, { props })
  }

  it('renders the label prop', async () => {
    const wrapper = await mountCard({ label: 'Total Platos', value: 42, loading: false })
    expect(wrapper.text()).toContain('Total Platos')
  })

  it('renders the value prop', async () => {
    const wrapper = await mountCard({ label: 'Total Platos', value: 42, loading: false })
    expect(wrapper.text()).toContain('42')
  })

  it('shows loading state when loading is true', async () => {
    const wrapper = await mountCard({ label: 'Total Platos', value: 0, loading: true })
    // Should show some loading indicator
    expect(wrapper.find('[data-testid="metric-loading"]').exists()).toBe(true)
  })

  it('does not show loading state when loading is false', async () => {
    const wrapper = await mountCard({ label: 'Total Platos', value: 42, loading: false })
    expect(wrapper.find('[data-testid="metric-loading"]').exists()).toBe(false)
  })

  it('renders with zero value', async () => {
    const wrapper = await mountCard({ label: 'Eventos Activos', value: 0, loading: false })
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('Eventos Activos')
  })
})
