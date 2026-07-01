/**
 * TDD: TRIANGULATE — AforoIndicator component (MCA-006)
 *
 * Tests progress bar width, color thresholds, mode toggle,
 * manual input visibility, and event emits.
 * Props: aforoInfo (AforoInfo).
 * Emits: mode-change ('auto' | 'manual'), manual-change (number).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import type { AforoInfo } from '~/shared/contracts/mesas.contract'

let AforoIndicator: Component | null = null

async function loadComponent() {
  if (AforoIndicator) return AforoIndicator
  const mod = await import(
    '../../../app/features/mesas/components/AforoIndicator.vue'
  )
  AforoIndicator = mod.default
  return AforoIndicator
}

function makeAforoInfo(overrides?: Partial<AforoInfo>): AforoInfo {
  return {
    modo: 'auto' as const,
    capacidad_total: 80,
    ocupacion_auto: 30,
    ocupacion_manual: 0,
    disponible: 50,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AforoIndicator', () => {
  // ── Rendering ──

  it('renders "Aforo" label', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: { aforoInfo: makeAforoInfo() },
    })

    expect(wrapper.text()).toContain('Aforo')
  })

  it('renders disp/cap plazas counter', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ disponible: 45, capacidad_total: 100 }),
      },
    })

    expect(wrapper.text()).toContain('45 / 100 plazas')
  })

  // ── Progress bar ──

  it('progress bar width is computed from ocupacion/capacidad', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          capacidad_total: 100,
          ocupacion_auto: 40,
          disponible: 60,
        }),
      },
    })

    const bar = wrapper.find('.h-2\\.5 + div > div') // inner filled bar
    // The progress bar inner div should have style width 40%
    const allDivs = wrapper.findAll('div')
    const progressBar = allDivs.filter(
      (d) => d.attributes('style')?.includes('width'),
    )
    expect(progressBar.length).toBeGreaterThan(0)
    const widthStyle = progressBar[0]?.attributes('style') ?? ''
    expect(widthStyle).toContain('40%')
  })

  it('green bar when occupancy is below 70%', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          capacidad_total: 100,
          ocupacion_auto: 30,
          disponible: 70,
        }),
      },
    })

    // Green class: bg-green-500
    const greenBar = wrapper.find('.bg-green-500')
    expect(greenBar.exists()).toBe(true)
  })

  it('yellow bar when occupancy is between 70% and 90%', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          capacidad_total: 100,
          ocupacion_auto: 75,
          disponible: 25,
        }),
      },
    })

    const yellowBar = wrapper.find('.bg-yellow-500')
    expect(yellowBar.exists()).toBe(true)
  })

  it('red bar when occupancy is above 90%', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          capacidad_total: 100,
          ocupacion_auto: 95,
          disponible: 5,
        }),
      },
    })

    const redBar = wrapper.find('.bg-red-500')
    expect(redBar.exists()).toBe(true)
  })

  // ── Mode toggle (radio buttons) ──

  it('renders "Automático" and "Manual" radio buttons', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: { aforoInfo: makeAforoInfo() },
    })

    expect(wrapper.text()).toContain('Automático')
    expect(wrapper.text()).toContain('Manual')
  })

  it('"Automático" radio is checked when modo=auto', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ modo: 'auto' }),
      },
    })

    const autoRadio = wrapper.find('input[value="auto"]')
    expect((autoRadio.element as HTMLInputElement).checked).toBe(true)
  })

  it('"Manual" radio is checked when modo=manual', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ modo: 'manual', ocupacion_manual: 45 }),
      },
    })

    const manualRadio = wrapper.find('input[value="manual"]')
    expect((manualRadio.element as HTMLInputElement).checked).toBe(true)
  })

  it('emits mode-change with "manual" when Manual radio is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: { aforoInfo: makeAforoInfo({ modo: 'auto' }) },
    })

    const manualRadio = wrapper.find('input[value="manual"]')
    await manualRadio.setValue(true)

    expect(wrapper.emitted('mode-change')).toBeTruthy()
    expect(wrapper.emitted('mode-change')?.[0]).toEqual(['manual'])
  })

  it('emits mode-change with "auto" when Automático radio is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ modo: 'manual', ocupacion_manual: 20 }),
      },
    })

    const autoRadio = wrapper.find('input[value="auto"]')
    await autoRadio.setValue(true)

    expect(wrapper.emitted('mode-change')).toBeTruthy()
    expect(wrapper.emitted('mode-change')?.[0]).toEqual(['auto'])
  })

  // ── Manual input ──

  it('does not show manual input when modo=auto', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: { aforoInfo: makeAforoInfo({ modo: 'auto' }) },
    })

    expect(wrapper.text()).not.toContain('Ocupación manual')
  })

  it('shows manual input with label when modo=manual', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ modo: 'manual', ocupacion_manual: 30 }),
      },
    })

    expect(wrapper.text()).toContain('Ocupación manual')
    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('30')
  })

  it('emits manual-change with number when manual input changes', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({ modo: 'manual', ocupacion_manual: 15 }),
      },
    })

    const input = wrapper.find('input[type="number"]')
    await input.setValue(42)

    expect(wrapper.emitted('manual-change')).toBeTruthy()
    expect(wrapper.emitted('manual-change')?.[0]).toEqual([42])
  })

  // ── Manual mode uses ocupacion_manual for calculation ──

  it('uses ocupacion_manual for progress bar in manual mode', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          modo: 'manual',
          capacidad_total: 100,
          ocupacion_auto: 30,
          ocupacion_manual: 80,
          disponible: 20,
        }),
      },
    })

    // Should be red (80% > 70%)
    const redBar = wrapper.find('.bg-yellow-500')
    expect(redBar.exists()).toBe(true)
  })

  it('handles zero capacidad_total without division by zero', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        aforoInfo: makeAforoInfo({
          capacidad_total: 0,
          ocupacion_auto: 0,
          disponible: 0,
        }),
      },
    })

    // Should render without crashing
    expect(wrapper.text()).toContain('0 / 0 plazas')
  })
})
