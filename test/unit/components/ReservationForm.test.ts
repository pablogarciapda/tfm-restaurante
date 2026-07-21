/**
 * ReservationForm.test.ts — Reservation form with slot grid (RF-001, SLA-001–SLA-006)
 *
 * Tests:
 * - 5 basic fields: nombre, apellidos, telefono, email, numero_comensales
 * - Date picker (replaces datetime-local)
 * - Slot grid rendering when horariosConfig provided and date selected
 * - Blocked date handling
 * - Spanish phone format validation
 * - Emit submit with valid data
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReservationForm from '../../../app/components/ReservationForm.vue'

describe('ReservationForm (RF-001 + SLA slots)', () => {
  it('renders 5 basic fields (no datetime-local)', () => {
    const wrapper = mount(ReservationForm)
    expect(wrapper.find('#nombre').exists()).toBe(true)
    expect(wrapper.find('#apellidos').exists()).toBe(true)
    expect(wrapper.find('#telefono').exists()).toBe(true)
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('#numero_comensales').exists()).toBe(true)
    // Date picker replaced datetime-local
    expect(wrapper.find('#fecha_hora').exists()).toBe(false)
  })

  it('renders date picker (replaces datetime-local)', () => {
    const wrapper = mount(ReservationForm)
    expect(wrapper.find('#fecha').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reserva-fecha"]').exists()).toBe(true)
  })

  it('shows error when nombre is empty on submit', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('El nombre es obligatorio')
  })

  it('shows error when nombre is too short (< 2 chars)', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#nombre').setValue('A')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('El nombre debe tener al menos 2 caracteres')
  })

  it('accepts Spanish phone format (9 digits, starts with 6)', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('612345678')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).not.toContain('Formato de teléfono')
  })

  it('accepts Spanish phone with +34 prefix', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('+34612345678')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).not.toContain('Formato de teléfono')
  })

  it('accepts Spanish phone with 34 prefix', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('34612345678')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).not.toContain('Formato de teléfono')
  })

  it('rejects invalid Spanish phone', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('12345')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Formato de teléfono no válido')
  })

  it('rejects phone starting with 5 (not Spanish mobile)', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('512345678')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Formato de teléfono')
  })

  it('shows error when email is invalid', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#email').setValue('not-an-email')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Email no válido')
  })

  it('shows error when comensales is out of range', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#numero_comensales').setValue(0)
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Entre 1 y 20 comensales')
  })

  it('apellidos is optional — emits undefined when empty', async () => {
    const horariosConfig = {
      comida_inicio: '13:30', comida_fin: '15:30',
      cena_inicio: '21:00', cena_fin: '23:30',
      intervalo_minutos: 15,
    }

    const wrapper = mount(ReservationForm, {
      props: { horariosConfig },
    })

    await wrapper.find('#nombre').setValue('Carlos')
    await wrapper.find('#telefono').setValue('600123456')
    await wrapper.find('#email').setValue('carlos@test.com')
    await wrapper.find('#numero_comensales').setValue(2)

    // Select date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().split('T')[0]!
    await wrapper.find('#fecha').setValue(dateStr)
    await wrapper.vm.$nextTick()

    // Select a slot
    const slotBtn = wrapper.find('[data-testid="slot-13:30"]')
    expect(slotBtn.exists()).toBe(true)
    await slotBtn.trigger('click')

    await wrapper.find('form').trigger('submit.prevent')

    const emitted = wrapper.emitted('submit')
    expect(emitted![0][0].apellidos).toBeUndefined()
  })

  describe('Slot grid — with horariosConfig prop', () => {
    const horariosConfig = {
      comida_inicio: '13:30', comida_fin: '15:30',
      cena_inicio: '21:00', cena_fin: '23:30',
      intervalo_minutos: 15,
    }

    it('does not render slots when no date selected', () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })
      expect(wrapper.find('[data-testid="slot-13:30"]').exists()).toBe(false)
    })

    it('renders slot grid when date is selected', async () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)
      const dateStr = futureDate.toISOString().split('T')[0]!
      await wrapper.find('#fecha').setValue(dateStr)
      await wrapper.vm.$nextTick()

      // Slots should be rendered
      expect(wrapper.find('[data-testid="slot-13:30"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="slot-15:15"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="slot-21:00"]').exists()).toBe(true)
    })

    it('selects a slot and highlights it', async () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)
      const dateStr = futureDate.toISOString().split('T')[0]!
      await wrapper.find('#fecha').setValue(dateStr)
      await wrapper.vm.$nextTick()

      const slotBtn = wrapper.find('[data-testid="slot-14:00"]')
      expect(slotBtn.exists()).toBe(true)
      await slotBtn.trigger('click')
      await wrapper.vm.$nextTick()

      // Selected slot should have active class
      expect(slotBtn.classes()).toContain('bg-terracotta')
    })

    it('emits submit with fecha_hora built from date + slot', async () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })

      await wrapper.find('#nombre').setValue('Maria')
      await wrapper.find('#telefono').setValue('612345678')
      await wrapper.find('#email').setValue('maria@test.com')
      await wrapper.find('#numero_comensales').setValue(4)

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const dateStr = futureDate.toISOString().split('T')[0]!
      await wrapper.find('#fecha').setValue(dateStr)
      await wrapper.vm.$nextTick()

      const slotBtn = wrapper.find('[data-testid="slot-13:30"]')
      await slotBtn.trigger('click')

      await wrapper.find('form').trigger('submit.prevent')

      const emitted = wrapper.emitted('submit')
      expect(emitted).toBeTruthy()
      expect(emitted![0][0]).toEqual({
        nombre: 'Maria',
        apellidos: undefined,
        telefono: '612345678',
        email: 'maria@test.com',
        fecha_hora: expect.stringContaining('T13:30:00'),
        numero_comensales: 4,
        zona_id: undefined,
      })
    })

    it('shows "COMIDA" and "CENA" section labels', async () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)
      const dateStr = futureDate.toISOString().split('T')[0]!
      await wrapper.find('#fecha').setValue(dateStr)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('COMIDA')
      expect(wrapper.text()).toContain('CENA')
    })

    it('requires slot selection — shows error when slot not selected', async () => {
      const wrapper = mount(ReservationForm, {
        props: { horariosConfig },
      })

      await wrapper.find('#nombre').setValue('Maria')
      await wrapper.find('#telefono').setValue('612345678')
      await wrapper.find('#email').setValue('maria@test.com')
      await wrapper.find('#numero_comensales').setValue(4)

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const dateStr = futureDate.toISOString().split('T')[0]!
      await wrapper.find('#fecha').setValue(dateStr)
      await wrapper.vm.$nextTick()

      await wrapper.find('form').trigger('submit.prevent')

      expect(wrapper.text()).toContain('Selecciona un horario')
    })
  })

  describe('Blocked dates', () => {
    const horariosConfig = {
      comida_inicio: '13:30', comida_fin: '15:30',
      cena_inicio: '21:00', cena_fin: '23:30',
      intervalo_minutos: 15,
    }

    it('shows blocked message when selected date is blocked', async () => {
      const today = new Date()
      const blockedDate = new Date(today)
      blockedDate.setDate(blockedDate.getDate() + 5)
      const blockedStr = blockedDate.toISOString().split('T')[0]!

      const wrapper = mount(ReservationForm, {
        props: {
          horariosConfig,
          diasBloqueados: [blockedStr],
        },
      })

      await wrapper.find('#fecha').setValue(blockedStr)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('no está disponible')
    })

    it('does not show blocked message for non-blocked date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const futureStr = futureDate.toISOString().split('T')[0]!

      const wrapper = mount(ReservationForm, {
        props: {
          horariosConfig,
          diasBloqueados: ['2020-01-01'], // old date, not matching
        },
      })

      await wrapper.find('#fecha').setValue(futureStr)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('no está disponible')
      // Slots should be visible for non-blocked date
      expect(wrapper.find('[data-testid="slot-13:30"]').exists()).toBe(true)
    })
  })
})
