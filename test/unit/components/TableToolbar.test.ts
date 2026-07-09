/**
 * TDD: Slice 4 update — TableToolbar component (fusion buttons)
 *
 * Tests button rendering, disabled states, and event emits
 * including "Fusionar" and "Desfusionar" buttons (Slice 4).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import type { Component } from 'vue'
import type { Mesa, AforoInfo } from '~/shared/contracts/mesas.contract'

const g = globalThis as Record<string, unknown>
g.useImageUpload = () => ({
  uploading: ref(false),
  uploadError: ref(null),
  uploadFromFile: vi.fn().mockResolvedValue(null),
  uploadFromUrl: vi.fn().mockResolvedValue(null),
  validateImage: vi.fn().mockReturnValue(null),
  compressToWebP: vi.fn(),
})

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
    forma: 'rectangular',
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
        canFusionar: true,
        designMode: false,
      },
    })

    expect(wrapper.text()).toContain('Fusionar')
    expect(wrapper.text()).toContain('Desfusionar')
  })

  it('renders AforoIndicator child component', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: true,
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
        canFusionar: true,
        designMode: true,
      },
    })

    const deleteBtn = findButton(wrapper, 'Eliminar')
    expect(deleteBtn.attributes('disabled')).toBeUndefined()
  })

  // ── Emits ──

  // ── Shape selector (AD-14) ──

  it('renders a shape selector dropdown with 4 options', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        designMode: true,
      },
    })

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options).toHaveLength(4)
    expect(options[0].text()).toBe('Rectangular')
    expect(options[1].text()).toBe('Cuadrada')
    expect(options[2].text()).toBe('Redonda')
    expect(options[3].text()).toBe('Ovalada')
  })

  it('defaults shape selector to rectangular', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        designMode: true,
      },
    })

    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('rectangular')
  })

  it('emits add with shape when "Nueva Mesa" is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        designMode: true,
      },
    })

    await findButton(wrapper, 'Nueva Mesa').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
    // Default shape is 'rectangular'
    expect(wrapper.emitted('add')![0]).toEqual(['rectangular'])
  })

  it('emits add with selected shape when changed', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        designMode: true,
      },
    })

    const select = wrapper.find('select')
    await select.setValue('redonda')
    await findButton(wrapper, 'Nueva Mesa').trigger('click')
    expect(wrapper.emitted('add')![0]).toEqual(['redonda'])
  })

  it('emits fuse when "Fusionar" is clicked and enabled', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: true,
        canUnfuse: false,
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: false,
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
        canFusionar: true,
        designMode: true,
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
        canFusionar: true,
        designMode: true,
      },
    })

    await findButton(wrapper, 'Guardar').trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  // ── Mode toggle ──

  it('renders mode toggle button when canDesign is true', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canDesign: true,
        designMode: false,
      },
    })

    const toggleBtn = findButton(wrapper, 'Operación')
    expect(toggleBtn.exists()).toBe(true)
  })

  it('emits toggleMode when mode button is clicked', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canDesign: true,
        designMode: false,
      },
    })

    await findButton(wrapper, 'Operación').trigger('click')
    expect(wrapper.emitted('toggleMode')).toBeTruthy()
  })

  it('shows Operación label when in diseño mode', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canDesign: true,
        designMode: true,
      },
    })

    const toggleBtn = findButton(wrapper, 'Diseño')
    expect(toggleBtn.exists()).toBe(true)
  })

  it('hides fusion buttons in diseño mode', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: true,
        canUnfuse: true,
        canFusionar: true,
        canDesign: true,
        designMode: true,
      },
    })

    expect(wrapper.text()).not.toContain('Fusionar')
    expect(wrapper.text()).not.toContain('Desfusionar')
  })

  it('hides add/delete/save buttons in operación mode', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        canFusionar: true,
        canDesign: true,
        designMode: false,
      },
    })

    expect(wrapper.text()).not.toContain('Nueva Mesa')
    expect(wrapper.text()).not.toContain('Eliminar')
    expect(wrapper.text()).not.toContain('Guardar')
  })

  it('renders turn filter in both modes', async () => {
    const comp = await loadComponent()
    // Test in diseño mode
    const wrapper1 = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        designMode: true,
      },
    })
    expect(wrapper1.text()).toContain('Comida')
    expect(wrapper1.text()).toContain('Cena')

    // Test in operación mode
    const wrapper2 = mount(comp, {
      props: {
        selectedMesa: null,
        aforoInfo: makeAforoInfo(),
        canFuse: false,
        canUnfuse: false,
        designMode: false,
      },
    })
    expect(wrapper2.text()).toContain('Comida')
    expect(wrapper2.text()).toContain('Cena')
  })
})
