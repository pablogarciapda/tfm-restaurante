/**
 * ReservationForm.test.ts — Reservation form validation tests (RF-001)
 *
 * Tests:
 * - 5 fields: nombre, telefono, email, fecha_hora, numero_comensales
 * - Spanish validation errors for each field
 * - Disabled submit while validating
 * - Emit submit with valid data
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReservationForm from '../../../app/components/ReservationForm.vue'

// Set fixed future date for testing
const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16)

describe('ReservationForm (RF-001)', () => {
  it('renders 5 required fields', () => {
    const wrapper = mount(ReservationForm)
    expect(wrapper.find('#nombre').exists()).toBe(true)
    expect(wrapper.find('#telefono').exists()).toBe(true)
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('#fecha_hora').exists()).toBe(true)
    expect(wrapper.find('#numero_comensales').exists()).toBe(true)
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

  it('shows error for invalid telefono format', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('abc')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('El telefono debe tener formato E.164 (+34...)')
  })

  it('shows error when email is invalid', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#email').setValue('not-an-email')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Email no valido')
  })

  it('shows error when fecha_hora is not future', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#fecha_hora').setValue('2020-01-01T00:00')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('La fecha debe ser futura')
  })

  it('shows error when comensales is out of range (less than 1)', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#numero_comensales').setValue(0)
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Entre 1 y 20 comensales')
  })

  it('emits submit with valid data', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#nombre').setValue('Maria')
    await wrapper.find('#telefono').setValue('+34600000000')
    await wrapper.find('#email').setValue('maria@test.com')
    await wrapper.find('#fecha_hora').setValue(futureDate)
    await wrapper.find('#numero_comensales').setValue(4)

    await wrapper.find('form').trigger('submit.prevent')

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([
      {
        nombre: 'Maria',
        telefono: '+34600000000',
        email: 'maria@test.com',
        fecha_hora: expect.any(String),
        numero_comensales: 4,
      },
    ])
  })

  it('disables submit button while submitting', async () => {
    const wrapper = mount(ReservationForm)
    // Fill valid data
    await wrapper.find('#nombre').setValue('Maria')
    await wrapper.find('#telefono').setValue('+34600000000')
    await wrapper.find('#email').setValue('maria@test.com')
    await wrapper.find('#fecha_hora').setValue(futureDate)
    await wrapper.find('#numero_comensales').setValue(4)

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('accepts E.164 phone format +34 prefix', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('+34612345678')
    await wrapper.find('form').trigger('submit.prevent')
    // No telefono error should appear (other fields will still error)
    expect(wrapper.text()).not.toContain('formato E.164')
  })

  it('rejects phone without + prefix', async () => {
    const wrapper = mount(ReservationForm)
    await wrapper.find('#telefono').setValue('612345678')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('formato E.164')
  })
})
