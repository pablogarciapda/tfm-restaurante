/**
 * TDD: RED → GREEN — FusionConfirmDialog component (MFU-005)
 *
 * Modal dialog shown when unfusing tables that have reservations.
 * Since content is Teleported to body, tests query document.body directly
 * and verify emitted events after clicking teleported buttons.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

let FusionConfirmDialog: unknown = null

async function loadComponent() {
  if (FusionConfirmDialog) return FusionConfirmDialog
  const mod = await import(
    '../../../app/features/mesas/components/FusionConfirmDialog.vue'
  )
  FusionConfirmDialog = mod.default
  return FusionConfirmDialog
}

interface MockReservation {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

function makeReserva(overrides?: Partial<MockReservation>): MockReservation {
  return {
    id: 'r1',
    nombre_cliente: 'Ana García',
    fecha_hora: '2026-07-02T20:00:00.000Z',
    numero_comensales: 4,
    estado: 'confirmada',
    mesa_id: 'm1',
    ...overrides,
  }
}

// Helper: clean up teleported content between tests
function cleanupBody() {
  // Remove nodes that have been teleported
  const teleported = document.body.querySelector('[data-testid="fusion-dialog"]')
  if (teleported) teleported.remove()
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanupBody()
})

describe('FusionConfirmDialog', () => {
  it('does not render when show is false', async () => {
    const comp = await loadComponent()
    mount(comp as never, {
      props: {
        show: false,
        reservations: [],
        fusionId: 'f1',
      },
    })

    await nextTick()

    expect(document.body.querySelector('[data-testid="fusion-dialog"]')).toBeNull()
  })

  it('renders dialog with reservation count and Spanish message', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeReserva({ id: 'r1' }),
      makeReserva({ id: 'r2', nombre_cliente: 'Carlos López' }),
    ]

    mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain('2 reservas')
    expect(dialog!.textContent).toContain('Ana García')
    expect(dialog!.textContent).toContain('Carlos López')
  })

  it('renders reservation details: name and pax', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeReserva({
        id: 'r1',
        nombre_cliente: 'María Pérez',
        numero_comensales: 3,
      }),
    ]

    mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    expect(dialog!.textContent).toContain('María Pérez')
    expect(dialog!.textContent).toContain('3')
  })

  it('renders three action buttons inside dialog', async () => {
    const comp = await loadComponent()
    const reservas = [makeReserva()]

    mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    const buttons = dialog!.querySelectorAll('button')
    expect(buttons.length).toBe(3)
  })

  it('emits cancel when cancel button is clicked', async () => {
    const comp = await loadComponent()
    const reservas = [makeReserva()]

    const wrapper = mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    const cancelBtn = dialog!.querySelector('[data-testid="btn-cancel"]')
    expect(cancelBtn).not.toBeNull()
    ;(cancelBtn as HTMLElement).click()

    await nextTick()
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits standby when standby button is clicked', async () => {
    const comp = await loadComponent()
    const reservas = [makeReserva()]

    const wrapper = mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    const standbyBtn = dialog!.querySelector('[data-testid="btn-standby"]')
    expect(standbyBtn).not.toBeNull()
    ;(standbyBtn as HTMLElement).click()

    await nextTick()
    expect(wrapper.emitted('standby')).toBeTruthy()
  })

  it('emits close when close button is clicked', async () => {
    const comp = await loadComponent()
    const reservas = [makeReserva()]

    const wrapper = mount(comp as never, {
      props: {
        show: true,
        reservations: reservas,
        fusionId: 'f1',
      },
    })

    await nextTick()

    const dialog = document.body.querySelector('[data-testid="fusion-dialog"]')
    const closeBtn = dialog!.querySelector('[data-testid="btn-close"]')
    expect(closeBtn).not.toBeNull()
    ;(closeBtn as HTMLElement).click()

    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
