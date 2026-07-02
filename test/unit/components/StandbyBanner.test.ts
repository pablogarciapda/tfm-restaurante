/**
 * TDD: RED → GREEN — StandbyBanner component (MFU-006)
 *
 * Floating banner at top of canvas showing standby reservations.
 * Props: reservations (ReservaStandby[])
 * Emits: assign(reservaId)
 *
 * Spanish labels: "Reservas pendientes de asignación",
 * "Asignar mesa", "No hay reservas pendientes"
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

let StandbyBanner: unknown = null

async function loadComponent() {
  if (StandbyBanner) return StandbyBanner
  const mod = await import(
    '../../../app/features/mesas/components/StandbyBanner.vue'
  )
  StandbyBanner = mod.default
  return StandbyBanner
}

interface MockReservation {
  id: string
  nombre_cliente: string
  fecha_hora: string
  numero_comensales: number
  estado: string
  mesa_id: string
}

function makeStandbyReserva(overrides?: Partial<MockReservation>): MockReservation {
  return {
    id: 'r1',
    nombre_cliente: 'Ana García',
    fecha_hora: '2026-07-02T20:00:00.000Z',
    numero_comensales: 4,
    estado: 'standby',
    mesa_id: 'm1',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StandbyBanner', () => {
  it('renders empty state when no standby reservations', async () => {
    const comp = await loadComponent()
    const wrapper = mount(comp as never, {
      props: {
        reservations: [],
      },
    })

    await nextTick()

    expect(wrapper.text()).toContain('No hay reservas pendientes')
  })

  it('renders banner with standby reservations', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeStandbyReserva({ id: 'r1', nombre_cliente: 'Ana García' }),
      makeStandbyReserva({ id: 'r2', nombre_cliente: 'Carlos López' }),
    ]

    const wrapper = mount(comp as never, {
      props: {
        reservations: reservas,
      },
    })

    await nextTick()

    expect(wrapper.text()).toContain('Reservas pendientes')
    expect(wrapper.text()).toContain('Ana García')
    expect(wrapper.text()).toContain('Carlos López')
  })

  it('renders reservation details: name, pax', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeStandbyReserva({
        id: 'r1',
        nombre_cliente: 'María Pérez',
        numero_comensales: 6,
      }),
    ]

    const wrapper = mount(comp as never, {
      props: {
        reservations: reservas,
      },
    })

    await nextTick()

    expect(wrapper.text()).toContain('María Pérez')
    expect(wrapper.text()).toContain('6')
  })

  it('renders "Asignar mesa" button for each reservation', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeStandbyReserva({ id: 'r1' }),
      makeStandbyReserva({ id: 'r2' }),
    ]

    const wrapper = mount(comp as never, {
      props: {
        reservations: reservas,
      },
    })

    await nextTick()

    const buttons = wrapper.findAll('button')
    const assignButtons = buttons.filter((btn) => btn.text().includes('Asignar mesa'))
    expect(assignButtons).toHaveLength(2)
  })

  it('emits assign with reservaId when "Asignar mesa" is clicked', async () => {
    const comp = await loadComponent()
    const reservas = [
      makeStandbyReserva({ id: 'reserva-42', nombre_cliente: 'Test' }),
    ]

    const wrapper = mount(comp as never, {
      props: {
        reservations: reservas,
      },
    })

    await nextTick()

    const assignBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Asignar mesa'))
    expect(assignBtn).toBeDefined()
    await assignBtn!.trigger('click')

    expect(wrapper.emitted('assign')).toBeTruthy()
    expect(wrapper.emitted('assign')![0]).toEqual(['reserva-42'])
  })
})
