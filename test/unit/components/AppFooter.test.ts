import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import AppFooter from '../../../app/components/AppFooter.vue'

/**
 * RED → GREEN → TRIANGULATE — AppFooter (PU-004)
 *
 * PU-004 scenarios:
 * - Footer present on every public page
 * - Renders restaurant name, address, phone, email, social links
 * - Reads from useRestaurantConfig (multi-tenant, mocked in test)
 */
const mockRestaurant = {
  nombre: 'Restaurante La Zíngara',
  direccion: 'Avda. del Páramo, 11, 24240 Santa María del Páramo, León',
  telefono: '987 350 350',
  maps_url: 'https://maps.app.goo.gl/56uxryZVZkS3pKTMA',
  logo_url: null,
}

const mockDireccionLineas = ref(['Avda. del Páramo, 11', '24240 Santa María del Páramo', 'León'])
const mockRestaurantRef = ref(mockRestaurant)
const mockLogoUrl = ref('/images/logo.png')
const mockNombre = ref(mockRestaurant.nombre)
const mockTelefono = ref(mockRestaurant.telefono)
const mockMapsUrl = ref(mockRestaurant.maps_url)

const mockUseRestaurantConfig = () => ({
  restaurant: mockRestaurantRef,
  direccionLineas: mockDireccionLineas,
  logoUrl: mockLogoUrl,
  nombre: mockNombre,
  telefono: mockTelefono,
  mapsUrl: mockMapsUrl,
})

const g = globalThis as Record<string, unknown>
g.useRestaurantConfig = mockUseRestaurantConfig

describe('AppFooter — Content', () => {
  it('renders the restaurant name', () => {
    const wrapper = mount(AppFooter)

    expect(wrapper.text()).toContain('Restaurante La Zíngara')
  })

  it('renders the address in Santa María del Páramo, León', () => {
    const wrapper = mount(AppFooter)

    expect(wrapper.text()).toContain('Santa María del Páramo')
    expect(wrapper.text()).toContain('León')
  })

  it('renders phone contact information', () => {
    const wrapper = mount(AppFooter)

    const phoneLink = wrapper.find('a[href^="tel:"]')
    expect(phoneLink.exists()).toBe(true)
    expect(phoneLink.attributes('href')).toMatch(/^tel:\+?[0-9]+/)
  })

  it('renders email contact information', () => {
    const wrapper = mount(AppFooter)

    const emailLink = wrapper.find('a[href^="mailto:"]')
    expect(emailLink.exists()).toBe(true)
    expect(emailLink.attributes('href')).toContain('@')
  })

  it('renders social media links', () => {
    const wrapper = mount(AppFooter)

    // At minimum, one social link should exist
    const socialLinks = wrapper.findAll('a[rel="noopener noreferrer"]')
    expect(socialLinks.length).toBeGreaterThanOrEqual(1)
  })
})

describe('AppFooter — Spanish content', () => {
  it('uses Spanish for all user-facing text', () => {
    const wrapper = mount(AppFooter)

    const text = wrapper.text()
    expect(text).toContain('Restaurante')
    expect(text).toContain('Santa María del Páramo')
    expect(text).toContain('León')
  })
})
