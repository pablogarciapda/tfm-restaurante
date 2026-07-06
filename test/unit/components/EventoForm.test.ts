/**
 * TDD: RED → GREEN → TRIANGULATE — EventoForm (CEV-002)
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })

const defaultCategorias = [
  { id: 'cat-1', nombre: 'Festivo', puesto: 10 },
  { id: 'cat-2', nombre: 'Espectáculo', puesto: 20 },
]

describe('EventoForm (CEV-002)', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const mod = await import('../../../app/components/EventoForm.vue')
    return mount(mod.default, { props: { initialEvento: null, categorias: defaultCategorias, ...props } })
  }

  it('renders Spanish labels', async () => {
    const wrapper = await mountForm()
    const text = wrapper.text()
    expect(text).toContain('Título')
    expect(text).toContain('Descripción')
    expect(text).toContain('Fecha')
    expect(text).toContain('Categoría')
  })

  it('validates titulo is required', async () => {
    const wrapper = await mountForm()
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('obligatorio')
  })

  it('emits submit with form data when valid', async () => {
    const wrapper = await mountForm()
    await wrapper.find('input[data-testid="evento-titulo"]').setValue('Noche Flamenca')
    await wrapper.find('input[data-testid="evento-fecha"]').setValue('2027-08-15T20:00')
    await wrapper.find('form').trigger('submit.prevent')

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0].titulo).toBe('Noche Flamenca')
  })
})
