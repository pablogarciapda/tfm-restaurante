/**
 * TDD: RED → GREEN → TRIANGULATE — PermissionsEditor (USR-003)
 *
 * 6 toggle switches for resource permissions:
 * carta, menu_diario, eventos, reservas, configuracion, usuarios.
 * v-model with boolean-per-resource object.
 * Disabled when role is 'admin' (implicit full access).
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Nuxt auto-import mocks ──
const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useSupabaseUser = () => ({ value: null })
g.useState = (_key: string, init?: unknown) => ({ value: init ?? null })

describe('PermissionsEditor (USR-003)', () => {
  const DEFAULT_PERMISSIONS = {
    carta: true,
    menu_diario: true,
    eventos: true,
    reservas: false,
    configuracion: false,
    usuarios: false,
  }

  async function mountEditor(props: Record<string, unknown> = {}) {
    const mod = await import(
      '../../../app/components/PermissionsEditor.vue'
    )
    return mount(mod.default, {
      props: {
        modelValue: DEFAULT_PERMISSIONS,
        role: 'editor',
        ...props,
      },
    })
  }

  // ── RED: All 6 toggles render with Spanish labels ──
  it('renders 6 toggle switches with Spanish labels', async () => {
    const wrapper = await mountEditor()
    const labels = ['Carta', 'Menú Diario', 'Eventos', 'Reservas', 'Configuración', 'Usuarios']

    for (const label of labels) {
      expect(wrapper.text()).toContain(label)
    }
  })

  // ── RED: Toggles reflect modelValue ──
  it('toggle checked state matches modelValue', async () => {
    const perms = { ...DEFAULT_PERMISSIONS, reservas: true }
    const wrapper = await mountEditor({ modelValue: perms })

    const reservasToggle = wrapper.find('input[type="checkbox"][value="reservas"]')
    expect((reservasToggle.element as HTMLInputElement).checked).toBe(true)

    const usuariosToggle = wrapper.find('input[type="checkbox"][value="usuarios"]')
    expect((usuariosToggle.element as HTMLInputElement).checked).toBe(false)
  })

  // ── RED: Emitting update toggles the permission ──
  it('emits update:modelValue when toggle changes', async () => {
    const wrapper = await mountEditor()

    const cartaToggle = wrapper.find('input[type="checkbox"][value="carta"]')
    // carta is true by default → uncheck it
    await cartaToggle.setValue(false)

    const emitted = wrapper.emitted('update:modelValue') as Array<[Record<string, boolean>]>
    expect(emitted).toBeTruthy()
    expect(emitted[0][0].carta).toBe(false)
  })

  // ── RED: Disabled when role is admin ──
  it('all toggles are disabled when role is admin', async () => {
    const wrapper = await mountEditor({ role: 'admin' })

    const toggles = wrapper.findAll('input[type="checkbox"]')
    for (let i = 0; i < toggles.length; i++) {
      expect((toggles[i].element as HTMLInputElement).disabled).toBe(true)
    }
  })

  // ── RED: Admin notice displayed ──
  it('shows "Acceso completo" message when role is admin', async () => {
    const wrapper = await mountEditor({ role: 'admin' })
    expect(wrapper.text()).toContain('Acceso completo')
  })

  // ── TRIANGULATE: Each toggle emits its own update independently ──
  it('each toggle emits an independent update:modelValue event', async () => {
    const wrapper = await mountEditor()

    // Toggle reservas ON (was false)
    await wrapper.find('input[value="reservas"]').setValue(true)
    // Toggle usuarios ON (was false)
    await wrapper.find('input[value="usuarios"]').setValue(true)
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue') as Array<[Record<string, boolean>]>
    expect(emitted).toBeTruthy()
    expect(emitted.length).toBeGreaterThanOrEqual(2)

    // First emission: reservas=true, everything else unchanged
    expect(emitted[0][0].reservas).toBe(true)
    // Second emission: usuarios=true (based on original props, not cumulative)
    expect(emitted[1][0].usuarios).toBe(true)
    expect(emitted[1][0].carta).toBe(true) // unchanged from original
  })

  // ── TRIANGULATE: Empty permissions object renders all unchecked ──
  it('works with empty permissions object', async () => {
    const allOff = {
      carta: false,
      menu_diario: false,
      eventos: false,
      reservas: false,
      configuracion: false,
      usuarios: false,
    }
    const wrapper = await mountEditor({ modelValue: allOff })

    const toggles = wrapper.findAll('input[type="checkbox"]')
    for (let i = 0; i < toggles.length; i++) {
      expect((toggles[i].element as HTMLInputElement).checked).toBe(false)
    }
  })
})
