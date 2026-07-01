/**
 * TDD: RED → GREEN → TRIANGULATE — TableToolbar component (MCA-003)
 *
 * Tests button rendering, disabled states, and event emits.
 * Props: selectedMesa (Mesa | null), aforoInfo (AforoInfo).
 * Emits: add, delete, save.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import type { Mesa, AforoInfo } from '~/shared/contracts/mesas.contract'

// ── Mock AforoIndicator to avoid Konva dependency ──
vi.mock('../../../app/features/mesas/components/AforoIndicator.vue', () => ({
  default: {
    name: 'AforoIndicator',
    props: ['aforoInfo'],
    template: '<div data-testid="aforo-indicator">{{ aforoInfo.disponible }}</div>',
  },
}))

let TableToolbar: Component | null = null

async function loadComponent() {
  if (TableToolbar) return TableToolbar
  const mod = await import(
    '../../../app/features/mesas/components/TableToolbar.vue'
  )
  TableToolbar = mod.default
  return TableToolbar
}

// ── Helper: create test data ──

function makeMesa(overrides?: Partial<Mesa>): Mesa {
  return {
    id: 'm1',
    numero_mesa: 1,
    capacidad_base: 4,
    posicion_x: 0,
    posicion_y: 0,
    ancho: 100,
    alto: 100,
    rotacion: 0,
    zona: 'Principal',
    mesa_padre_id: null,
    id_fusion: null,
    capacidad_actual: 4,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
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
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('TableToolbar', () => {
  // ── Rendering ──

  it('renders all three buttons', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    expect(wrapper.text()).toContain('Nueva Mesa')
    expect(wrapper.text()).toContain('Eliminar')
    expect(wrapper.text()).toContain('Guardar')
  })

  it('renders AforoIndicator child component', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    const aforoEl = wrapper.find('[data-testid="aforo-indicator"]')
    expect(aforoEl.exists()).toBe(true)
  })

  // ── Helper: find button by label text ──
  function findButton(wrapper: ReturnType<typeof mount>, label: string) {
    const buttons = wrapper.findAll('button')
    const found = buttons.find((btn) => btn.text().includes(label))
    if (!found) {
      throw new Error(`Button with text "${label}" not found. Found: ${buttons.map((b) => b.text()).join(', ')}`)
    }
    return found
  }

  // ── Disabled states ──

  it('disables delete button when no mesa is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    expect(deleteBtn.attributes('disabled')).toBeDefined()
  })

  it('enables delete button when a mesa is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: makeMesa({ numero_mesa: 3 }),
        aforoInfo: makeAforoInfo(),
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    expect(deleteBtn.attributes('disabled')).toBeUndefined()
  })

  it('shows selected mesa number when a mesa is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: makeMesa({ numero_mesa: 5 }),
        aforoInfo: makeAforoInfo(),
      },
    })

    expect(wrapper.text()).toContain('Mesa 5')
  })

  // ── Emits ──

  it('emits add when "Nueva Mesa" is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    const addBtn = findButton(wrapper, 'Nueva Mesa')
    await addBtn.trigger('click')

    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('emits delete when "Eliminar" is clicked (with selected mesa)', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: makeMesa({ id: 'm3', numero_mesa: 3 }),
        aforoInfo: makeAforoInfo(),
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    await deleteBtn.trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('emits save when "Guardar" is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    const saveBtn = findButton(wrapper, 'Guardar')
    await saveBtn.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('does not emit delete when button is disabled and clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    await deleteBtn.trigger('click')

    expect(wrapper.emitted('delete')).toBeFalsy()
  })
})
