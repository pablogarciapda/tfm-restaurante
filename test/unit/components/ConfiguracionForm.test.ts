/**
 * TDD: RED → GREEN → TRIANGULATE — ConfiguracionForm (CFG-001)
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })

describe('ConfiguracionForm (CFG-001)', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const mod = await import('../../../app/components/ConfiguracionForm.vue')
    return mount(mod.default, {
      props: {
        currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80 },
        ...props,
      },
    })
  }

  it('renders heading "Configuración del sistema"', async () => {
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('Configuración del sistema')
  })

  it('displays cliente_elige_mesa toggle unchecked when false', async () => {
    const wrapper = await mountForm()
    const checkbox = wrapper.find('input[data-testid="cfg-elige-mesa"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('displays capacidad_total_local input with current value', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: true, capacidad_total_local: 120 } })
    const input = wrapper.find('input[data-testid="cfg-capacidad"]')
    expect((input.element as HTMLInputElement).value).toBe('120')
  })

  it('emits submit with form data on save', async () => {
    const wrapper = await mountForm()
    // Toggle the checkbox
    await wrapper.find('input[data-testid="cfg-elige-mesa"]').setValue(true)
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0][0].cliente_elige_mesa).toBe(true)
  })

  it('validates capacidad min 1', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 0 } })
    // Set invalid value
    const input = wrapper.find('input[data-testid="cfg-capacidad"]')
    await input.setValue(0)
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('La capacidad debe ser al menos 1')
  })

  // ── CFG-004: modo_ocupacion radio buttons ──

  it('renders modo_ocupacion radio buttons with Automático and Manual labels', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    expect(wrapper.text()).toContain('Automático')
    expect(wrapper.text()).toContain('Manual')
    const radioAuto = wrapper.find('input[value="auto"]')
    const radioManual = wrapper.find('input[value="manual"]')
    expect(radioAuto.exists()).toBe(true)
    expect(radioManual.exists()).toBe(true)
  })

  it('checks the auto radio when modo_ocupacion is "auto"', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    const radioAuto = wrapper.find('input[value="auto"]')
    expect((radioAuto.element as HTMLInputElement).checked).toBe(true)
  })

  it('checks the manual radio when modo_ocupacion is "manual"', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80, modo_ocupacion: 'manual', ocupacion_manual: 0 } })
    const radioManual = wrapper.find('input[value="manual"]')
    expect((radioManual.element as HTMLInputElement).checked).toBe(true)
  })

  // ── CFG-005: ocupacion_manual number input ──

  it('shows ocupacion_manual number input when modo is "manual"', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80, modo_ocupacion: 'manual', ocupacion_manual: 15 } })
    const manualInput = wrapper.find('input[data-testid="cfg-ocupacion-manual"]')
    expect(manualInput.exists()).toBe(true)
    expect((manualInput.element as HTMLInputElement).value).toBe('15')
  })

  it('hides ocupacion_manual input when modo is "auto"', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: false, capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    const manualInput = wrapper.find('input[data-testid="cfg-ocupacion-manual"]')
    expect(manualInput.exists()).toBe(false)
  })

  it('emits submit with modo_ocupacion and ocupacion_manual fields', async () => {
    const wrapper = await mountForm({ currentConfig: { cliente_elige_mesa: true, capacidad_total_local: 100, modo_ocupacion: 'manual', ocupacion_manual: 25 } })
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeTruthy()
    const emittedData = wrapper.emitted('submit')![0][0]
    expect(emittedData.modo_ocupacion).toBe('manual')
    expect(emittedData.ocupacion_manual).toBe(25)
  })
})
