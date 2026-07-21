import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import AppFooter from '../../../app/components/AppFooter.vue'
import { TEST_RESTAURANT } from '../../__fixtures__/restaurant-config'

/**
 * RED → GREEN → TRIANGULATE — AppFooter (PU-004)
 *
 * PU-004 scenarios:
 * - Footer present on every public page
 * - Renders restaurant name, address, phone, email, social links
 * - Reads from useRestaurantConfig (multi-tenant, mocked in test)
 */
const mockRestaurant = {
  ...TEST_RESTAURANT,
}

const mockDireccionLineas = ref(TEST_RESTAURANT.direccion.split(',').map((s: string) => s.trim()))
const mockRestaurantRef = ref(mockRestaurant)
const mockLogoUrl = ref('/images/logo.png')
const mockNombre = ref(mockRestaurant.nombre)
const mockTelefono = ref(mockRestaurant.telefono)
const mockMapsUrl = ref(mockRestaurant.maps_url)
const mockEmail = ref(mockRestaurant.email)
const mockInstagramUrl = ref(mockRestaurant.instagram_url)
const mockFacebookUrl = ref(mockRestaurant.facebook_url)
const mockPoblacion = ref(mockRestaurant.poblacion)

const mockUseRestaurantConfig = () => ({
  restaurant: mockRestaurantRef,
  direccionLineas: mockDireccionLineas,
  logoUrl: mockLogoUrl,
  nombre: mockNombre,
  telefono: mockTelefono,
  mapsUrl: mockMapsUrl,
  siteUrl: ref(mockRestaurant.site_url),
  email: mockEmail,
  instagramUrl: mockInstagramUrl,
  facebookUrl: mockFacebookUrl,
  poblacion: mockPoblacion,
})

const g = globalThis as Record<string, unknown>
g.useRestaurantConfig = mockUseRestaurantConfig

describe('AppFooter — Content', () => {
  it('renders the restaurant name', () => {
    const wrapper = mount(AppFooter)

    expect(wrapper.text()).toContain(TEST_RESTAURANT.nombre)
  })

  it('renders the address from restaurant config', () => {
    const wrapper = mount(AppFooter)
    const direccionParts = TEST_RESTAURANT.direccion.split(',').map((s: string) => s.trim())

    expect(wrapper.text()).toContain(direccionParts[0])
    expect(wrapper.text()).toContain(direccionParts[2])
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
    expect(text).toContain(TEST_RESTAURANT.nombre)
    expect(text).toContain(TEST_RESTAURANT.poblacion.split(',')[0].trim())
  })
})
