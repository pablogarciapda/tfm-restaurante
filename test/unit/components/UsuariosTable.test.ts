/**
 * TDD: RED → GREEN → TRIANGULATE — UsuariosTable (USR-001)
 *
 * Table listing users: Email, Rol (badge), Activo (badge), Acciones.
 * Actions: Edit, Deactivate, Reset Password with confirmation dialogs.
 * Spanish labels throughout.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Nuxt auto-import mocks ──
const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useSupabaseUser = () => ({ value: null })
g.useState = (_key: string, init?: unknown) => ({ value: init ?? null })

const MOCK_USERS = [
  {
    id: 'u1',
    email: 'admin@test.com',
    role: 'admin',
    permissions: { carta: true, menu_diario: true },
    activo: true,
    created_at: '2026-01-01',
  },
  {
    id: 'u2',
    email: 'editor@test.com',
    role: 'editor',
    permissions: { carta: true, menu_diario: false },
    activo: false,
    created_at: '2026-02-01',
  },
]

describe('UsuariosTable (USR-001)', () => {
  async function mountTable(props: Record<string, unknown> = {}) {
    const mod = await import('../../../app/components/UsuariosTable.vue')
    return mount(mod.default, {
      props: {
        users: MOCK_USERS,
        ...props,
      },
    })
  }

  // ── RED: Table renders column headers in Spanish ──
  it('renders column headers in Spanish', async () => {
    const wrapper = await mountTable()
    expect(wrapper.text()).toContain('Email')
    expect(wrapper.text()).toContain('Rol')
    expect(wrapper.text()).toContain('Estado')
    expect(wrapper.text()).toContain('Acciones')
  })

  // ── RED: Renders user rows with email, role badge, status badge ──
  it('renders user emails and role badges', async () => {
    const wrapper = await mountTable()
    expect(wrapper.text()).toContain('admin@test.com')
    expect(wrapper.text()).toContain('editor@test.com')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.text()).toContain('Editor')
  })

  // ── RED: Shows active/inactive badges ──
  it('shows active badge for activo=true and inactive for activo=false', async () => {
    const wrapper = await mountTable()
    expect(wrapper.text()).toContain('Activo')
    expect(wrapper.text()).toContain('Inactivo')
  })

  // ── RED: Action buttons per row ──
  it('renders Edit, Deactivate, and Reset Password action buttons', async () => {
    const wrapper = await mountTable()
    // buttons in the DOM
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(6) // 3 per user × 2 users
  })

  // ── RED: Emits edit event with user id ──
  it('emits edit event when Edit button is clicked', async () => {
    const wrapper = await mountTable()
    const editButtons = wrapper.findAll('[data-testid="edit-user"]')
    await editButtons[0].trigger('click')

    const emitted = wrapper.emitted('edit') as Array<[string]>
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('u1')
  })

  // ── RED: Emits deactivate event after confirmation ──
  it('shows confirmation before deactivating', async () => {
    const wrapper = await mountTable()
    // Click deactivate on first user
    const deactivateBtn = wrapper.find('[data-testid="deactivate-user"]')
    await deactivateBtn.trigger('click')
    await nextTick()

    // Should show confirmation dialog
    expect(wrapper.text()).toContain('Seguro')
  })

  // ── RED: Empty state when no users ──
  it('shows empty state when no users', async () => {
    const wrapper = await mountTable({ users: [] })
    expect(wrapper.text()).toContain('No hay usuarios')
  })

  // ── RED: Emits reset-password event ──
  it('emits reset-password event when confirmed', async () => {
    const wrapper = await mountTable()
    const resetBtn = wrapper.find('[data-testid="reset-password"]')
    await resetBtn.trigger('click')
    await nextTick()

    // Confirm the reset
    const confirmBtn = wrapper.find('[data-testid="confirm-reset"]')
    await confirmBtn.trigger('click')

    const emitted = wrapper.emitted('reset-password') as Array<[string]>
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('u1')
  })

  // ── TRIANGULATE: Confirm deactivate then emit ──
  it('emits deactivate event after confirming dialog', async () => {
    const wrapper = await mountTable()
    const deactivateBtn = wrapper.find('[data-testid="deactivate-user"]')
    await deactivateBtn.trigger('click')
    await nextTick()

    // Confirm the deactivation
    const confirmBtn = wrapper.find('[data-testid="confirm-deactivate"]')
    await confirmBtn.trigger('click')

    const emitted = wrapper.emitted('deactivate') as Array<[string]>
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('u1')
  })

  // ── TRIANGULATE: Cancel deactivate does not emit ──
  it('does not emit deactivate when cancelled', async () => {
    const wrapper = await mountTable()
    const deactivateBtn = wrapper.find('[data-testid="deactivate-user"]')
    await deactivateBtn.trigger('click')
    await nextTick()

    const cancelBtn = wrapper.find('[data-testid="cancel-deactivate"]')
    await cancelBtn.trigger('click')

    expect(wrapper.emitted('deactivate')).toBeFalsy()
  })
})
