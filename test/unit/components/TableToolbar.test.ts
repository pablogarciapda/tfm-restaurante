/**
 * TDD: Slice 4 update — TableToolbar component (fusion buttons)
 *
 * Tests button rendering, disabled states, and event emits
 * including "Fusionar" and "Desfusionar" buttons (Slice 4).
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

// ── Helpers ──

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
    modo: 'auto',
    capacidad_total: 80,
    ocupacion_auto: 30,
    ocupacion_manual: 0,
    disponible: 50,
    ...overrides,
  }
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const buttons = wrapper.findAll('button')
  const found = buttons.find((btn) => btn.text().includes(label))
  if (!found) {
    throw new Error(`Button with text "${label}" not found. Found: ${buttons.map((b) => b.text()).join(', ')}`)
  }
  return found
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('TableToolbar', () => {
  // ── Basic rendering ──

  it('renders all toolbar buttons including Fusionar and Desfusionar', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    expect(wrapper.text()).toContain('Nueva Mesa')
    expect(wrapper.text()).toContain('Fusionar')
    expect(wrapper.text()).toContain('Desfusionar')
    expect(wrapper.text()).toContain('Eliminar')
    expect(wrapper.text()).toContain('Guardar')
  })

  it('renders AforoIndicator child component', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    const aforoEl = wrapper.find('[data-testid="aforo-indicator"]')
    expect(aforoEl.exists()).toBe(true)
  })

  // ── Disabled states ──

  it('disables Fusionar button when canFuse is false', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    const fuseBtn = findButton(wrapper, 'Fusionar')
    expect(fuseBtn.attributes('disabled')).toBeDefined()
  })

  it('enables Fusionar button when canFuse is true', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: true,
        canUnfuse: false,
      },
    })

    const fuseBtn = findButton(wrapper, 'Fusionar')
    expect(fuseBtn.attributes('disabled')).toBeUndefined()
  })

  it('disables Desfusionar button when canUnfuse is false', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    const unfuseBtn = findButton(wrapper, 'Desfusionar')
    expect(unfuseBtn.attributes('disabled')).toBeDefined()
  })

  it('disables delete button when no mesa is selected', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
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
        canFuse: false,
        canUnfuse: false,
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    expect(deleteBtn.attributes('disabled')).toBeUndefined()
  })

  // ── Emits ──

  it('emits add when "Nueva Mesa" is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    await findButton(wrapper, 'Nueva Mesa').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('emits fuse when "Fusionar" is clicked and enabled', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: true,
        canUnfuse: false,
      },
    })

    await findButton(wrapper, 'Fusionar').trigger('click')
    expect(wrapper.emitted('fuse')).toBeTruthy()
  })

  it('does not emit fuse when Fusionar is disabled', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    await findButton(wrapper, 'Fusionar').trigger('click')
    expect(wrapper.emitted('fuse')).toBeFalsy()
  })

  it('emits unfuse when "Desfusionar" is clicked and enabled', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: true,
      },
    })

    await findButton(wrapper, 'Desfusionar').trigger('click')
    expect(wrapper.emitted('unfuse')).toBeTruthy()
  })

  it('emits delete when "Eliminar" is clicked with selected mesa', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: makeMesa({ id: 'm3', numero_mesa: 3 }),
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    await findButton(wrapper, 'Eliminar').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('emits save when "Guardar" is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
      },
    })

    await findButton(wrapper, 'Guardar').trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
