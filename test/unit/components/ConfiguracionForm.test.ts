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
})
