/**
 * TDD: RED → GREEN → TRIANGULATE — PlatosTable (CRUD-001, CRUD-004, CRUD-005)
 *
 * Sortable table: nombre, categoria, precio, disponible toggle, edit/delete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
  })),
  auth: vi.fn(),
})

describe('PlatosTable (CRUD-001, CRUD-004, CRUD-005)', () => {
  const mockPlatos = [
    { id: '1', nombre: 'Croquetas', categoria: 'Entrantes', precio: 9.5, disponible: true, tipo_menu: 'carta', puesto: 1 },
    { id: '2', nombre: 'Paella', categoria: 'Arroces', precio: 15.0, disponible: false, tipo_menu: 'carta', puesto: 2 },
  ]

  async function mountTable(platos = mockPlatos) {
    const mod = await import('../../../app/components/PlatosTable.vue')
    return mount(mod.default, {
      props: { platos },
    })
  }

  it('renders table with plato data', async () => {
    const wrapper = await mountTable()

    const text = wrapper.text()
    expect(text).toContain('Croquetas')
    expect(text).toContain('Paella')
    expect(text).toContain('Entrantes')
    expect(text).toContain('Arroces')
  })

  it('shows "No hay platos" empty state when platos is empty', async () => {
    const wrapper = await mountTable([])

    expect(wrapper.text()).toContain('No hay platos')
  })

  it('emits edit with plato id on edit click', async () => {
    const wrapper = await mountTable()

    const editBtns = wrapper.findAll('[data-testid="edit-plato"]')
    await editBtns[0].trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0][0]).toBe('1')
  })

  it('emits delete with plato id on delete click', async () => {
    const wrapper = await mountTable()

    const delBtns = wrapper.findAll('[data-testid="delete-plato"]')
    await delBtns[0].trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0][0]).toBe('1')
  })
})
