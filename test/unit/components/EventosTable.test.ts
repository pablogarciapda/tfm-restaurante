/**
 * TDD: RED → GREEN → TRIANGULATE — EventosTable (CEV-001, CEV-003)
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })

describe('EventosTable (CEV-001, CEV-003)', () => {
  const mockEventos = [
    { id: '1', titulo: 'Fiesta', fecha: '2027-08-15T20:00:00Z', categoria: 'festivo', activo: true, estado: 'programado' },
  ]

  async function mountTable(eventos = mockEventos) {
    const mod = await import('../../../app/components/EventosTable.vue')
    return mount(mod.default, { props: { eventos } })
  }

  it('renders event data', async () => {
    const wrapper = await mountTable()
    expect(wrapper.text()).toContain('Fiesta')
  })

  it('shows empty state', async () => {
    const wrapper = await mountTable([])
    expect(wrapper.text()).toContain('No hay eventos')
  })

  it('emits edit on button click', async () => {
    const wrapper = await mountTable()
    await wrapper.find('[data-testid="edit-evento"]').trigger('click')
    expect(wrapper.emitted('edit')![0][0]).toBe('1')
  })

  it('emits delete on button click', async () => {
    const wrapper = await mountTable()
    await wrapper.find('[data-testid="delete-evento"]').trigger('click')
    expect(wrapper.emitted('delete')![0][0]).toBe('1')
  })
})
