/**
 * TDD: RED → GREEN → TRIANGULATE — PlatoForm (CRUD-002)
 *
 * Form for create/edit plato: nombre, descripcion, precio, categoria,
 * tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, recomendado.
 * Spanish labels, inline validation.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({
  from: vi.fn(),
  auth: vi.fn(),
  storage: {
    from: () => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.webp' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://test.com/img.webp' } }),
    }),
  },
})

describe('PlatoForm (CRUD-002)', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const mod = await import('../../../app/components/PlatoForm.vue')
    return mount(mod.default, {
      props: {
        initialPlato: null,
        ...props,
      },
    })
  }

  it('renders with Spanish labels for all fields', async () => {
    const wrapper = await mountForm()

    const text = wrapper.text()
    expect(text).toContain('Nombre')
    expect(text).toContain('Descripción')
    expect(text).toContain('Precio')
    expect(text).toContain('Categoría')
    expect(text).toContain('Tipo de menú')
    expect(text).toContain('Disponible')
  })

  it('shows "Crear plato" button in create mode', async () => {
    const wrapper = await mountForm()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Crear')
  })

  it('shows "Guardar cambios" button in edit mode (initialPlato provided)', async () => {
    const wrapper = await mountForm({
      initialPlato: {
        id: '1',
        nombre: 'Croquetas',
        precio: 9.5,
        categoria: 'Entrantes',
        tipo_menu: 'carta',
        disponible: true,
      },
    })

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.text()).toContain('Guardar')
  })

  it('validates nombre is required', async () => {
    const wrapper = await mountForm()

    // Submit with empty form
    await wrapper.find('form').trigger('submit.prevent')

    const text = wrapper.text()
    expect(text).toContain('obligatorio')
  })

  it('emits submit with form data when valid', async () => {
    const wrapper = await mountForm({
      categories: [
        { id: '1', nombre: 'Arroces', puesto: 10 },
        { id: '2', nombre: 'Entrantes', puesto: 20 },
      ],
    })

    // Fill nombre (required)
    const nombreInput = wrapper.find('input[data-testid="plato-nombre"]')
    await nombreInput.setValue('Paella Valenciana')

    // Fill precio
    const precioInput = wrapper.find('input[data-testid="plato-precio"]')
    await precioInput.setValue('15.50')

    // Fill categoria (select, not input anymore)
    const catSelect = wrapper.find('select[data-testid="plato-categoria"]')
    await catSelect.setValue('Arroces')

    await wrapper.find('form').trigger('submit.prevent')

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({
      nombre: 'Paella Valenciana',
      precio: 15.5,
      categoria: 'Arroces',
      disponible: true,
    })
  })
})
