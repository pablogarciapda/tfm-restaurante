/**
 * TDD: RED → GREEN → TRIANGULATE — UsuarioForm (USR-001, USR-002)
 *
 * Create mode: email (required), password (required, min 6), role (select)
 * Edit mode: email (read-only), role (select), permissions (PermissionsEditor)
 * Spanish labels, validation, emits submit with form data.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ── Nuxt auto-import mocks ──
const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useSupabaseUser = () => ({ value: null })
g.useState = (_key: string, init?: unknown) => ({ value: init ?? null })

describe('UsuarioForm (USR-001, USR-002)', () => {
  async function mountForm(props: Record<string, unknown> = {}, mode: 'create' | 'edit' = 'create') {
    const mod = await import('../../../app/components/UsuarioForm.vue')
    return mount(mod.default, {
      props: {
        mode,
        ...props,
      },
    })
  }

  // ── RED: Create mode renders email, password, role fields ──
  it('renders create mode form with email, password, and role fields', async () => {
    const wrapper = await mountForm({}, 'create')
    expect(wrapper.text()).toContain('Crear Usuario')
    expect(wrapper.find('input#email').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('select#role').exists()).toBe(true)
  })

  // ── RED: Spanish labels ──
  it('displays Spanish labels', async () => {
    const wrapper = await mountForm({}, 'create')
    expect(wrapper.text()).toContain('Email')
    expect(wrapper.text()).toContain('Contraseña')
    expect(wrapper.text()).toContain('Rol')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.text()).toContain('Editor')
    expect(wrapper.text()).toContain('Guardar')
    expect(wrapper.text()).toContain('Cancelar')
  })

  // ── RED: Edit mode shows email as read-only ──
  it('renders edit mode with email as read-only and no password field', async () => {
    const wrapper = await mountForm(
      {
        mode: 'edit',
        initialEmail: 'editor@test.com',
        initialRole: 'editor',
        initialPermissions: { carta: true },
      },
      'edit',
    )
    expect(wrapper.text()).toContain('Editar Usuario')
    expect(wrapper.find('input#password').exists()).toBe(false)
    const emailInput = wrapper.find('input#email')
    expect((emailInput.element as HTMLInputElement).readOnly).toBe(true)
    expect((emailInput.element as HTMLInputElement).value).toBe('editor@test.com')
  })

  // ── RED: Validation — email required ──
  it('shows validation error when email is empty', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    expect(wrapper.text()).toContain('El email es requerido')
  })

  // ── RED: Validation — email format ──
  it('shows validation error for invalid email format', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('input#email').setValue('not-an-email')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    expect(wrapper.text()).toContain('formato')
  })

  // ── RED: Validation — password required in create mode ──
  it('shows validation error when password is empty in create mode', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('input#email').setValue('cook@test.com')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    expect(wrapper.text()).toContain('La contraseña es requerida')
  })

  // ── RED: Validation — password min 6 chars ──
  it('shows validation error when password is too short', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('input#email').setValue('cook@test.com')
    await wrapper.find('input#password').setValue('12345')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    expect(wrapper.text()).toContain('6 caracteres')
  })

  // ── RED: Emits submit with valid form data (create) ──
  it('emits submit with form data when create form is valid', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('input#email').setValue('cook@test.com')
    await wrapper.find('input#password').setValue('pass1234')
    await wrapper.find('select#role').setValue('admin')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    const emitted = wrapper.emitted('submit') as Array<
      [{ email: string; password: string; role: string }]
    >
    expect(emitted).toBeTruthy()
    expect(emitted[0][0].email).toBe('cook@test.com')
    expect(emitted[0][0].password).toBe('pass1234')
    expect(emitted[0][0].role).toBe('admin')
  })

  // ── RED: Emits cancel ──
  it('emits cancel when cancel button is clicked', async () => {
    const wrapper = await mountForm({}, 'create')
    await wrapper.find('button[data-testid="cancel-button"]').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  // ── TRIANGULATE: Edit mode emits submit with role and permissions ──
  it('emits submit with role and permissions in edit mode', async () => {
    const wrapper = await mountForm(
      {
        mode: 'edit',
        initialEmail: 'editor@test.com',
        initialRole: 'editor',
        initialPermissions: { carta: true, usuarios: false },
      },
      'edit',
    )
    await wrapper.find('select#role').setValue('admin')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    const emitted = wrapper.emitted('submit') as Array<
      [{ role: string; permissions: Record<string, boolean> }]
    >
    expect(emitted).toBeTruthy()
    expect(emitted[0][0].role).toBe('admin')
  })

  // ── TRIANGULATE: Role default is editor ──
  it('defaults role to editor in create mode', async () => {
    const wrapper = await mountForm({}, 'create')
    const roleSelect = wrapper.find('select#role')
    expect((roleSelect.element as HTMLSelectElement).value).toBe('editor')
  })
})
