import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import AppHeader from '../../../app/components/AppHeader.vue'
import { TEST_RESTAURANT } from '../../__fixtures__/restaurant-config'

/**
 * RED → GREEN → TRIANGULATE — AppHeader (PU-003)
 *
 * PU-003 scenarios:
 * - Desktop: 6 links visible, hamburger hidden
 * - Mobile: hamburger visible, links hidden
 * - Toggle: click hamburger opens/closes nav
 * - Logo from useRestaurantConfig (mocked)
 */

// Mock useRestaurantConfig for unit test (no Nuxt SSR context)
const mockUseRestaurantConfig = () => ({
  logoUrl: ref('/images/logo.png'),
  nombre: ref(TEST_RESTAURANT.nombre),
  restaurant: ref({}),
  direccionLineas: ref([]),
  telefono: ref(''),
  mapsUrl: ref(''),
})
const g = globalThis as Record<string, unknown>
g.useRestaurantConfig = mockUseRestaurantConfig

const NAV_LINKS = [
  { label: 'Inicio', to: '/' },
  { label: 'Carta', to: '/carta' },
  { label: 'Menú', to: '/menu-diario' },
  { label: 'Reservas', to: '/reservas' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Contacto', to: '/contacto' },
]

describe('AppHeader — Navigation links', () => {
  it('renders all 6 navigation links with correct Spanish labels', () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            template:
              '<a :href="to" v-bind="$attrs"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    // Scope to desktop nav links container (excludes brand logo link)
    const navContainer = wrapper.get('[data-testid="nav-links"]')
    const links = navContainer.findAll('a')
    expect(links).toHaveLength(NAV_LINKS.length)

    for (const { label, to } of NAV_LINKS) {
      const link = navContainer.get(`a[href="${to}"]`)
      expect(link.text()).toBe(label)
    }
  })

  it('routes each link to the correct path', () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            template:
              '<a :href="to" v-bind="$attrs"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const navContainer = wrapper.get('[data-testid="nav-links"]')
    const links = navContainer.findAll('a')
    const hrefs = links.map((l) => l.attributes('href'))
    expect(hrefs).toEqual([
      '/',
      '/carta',
      '/menu-diario',
      '/reservas',
      '/eventos',
      '/contacto',
    ])
  })
})

describe('AppHeader — Mobile hamburger toggle', () => {
  it('renders a hamburger button for mobile navigation', () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            template:
              '<a :href="to" v-bind="$attrs"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const hamburgerBtn = wrapper.find(
      'button[aria-label="Abrir menú de navegación"]'
    )
    expect(hamburgerBtn.exists()).toBe(true)
  })

  it('toggles navigation visibility when hamburger is clicked', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            template:
              '<a :href="to" v-bind="$attrs"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const hamburgerBtn = wrapper.find(
      'button[aria-label="Abrir menú de navegación"]'
    )

    // Mobile nav should be hidden initially (data attribute check)
    const navContainer = wrapper.find('[data-testid="nav-links"]')
    expect(navContainer.exists()).toBe(true)
    // On mobile, nav is hidden by default; hamburger click reveals it
    // We test the reactive state: toggle changes aria-expanded
    expect(hamburgerBtn.attributes('aria-expanded')).toBe('false')

    await hamburgerBtn.trigger('click')
    expect(hamburgerBtn.attributes('aria-expanded')).toBe('true')

    await hamburgerBtn.trigger('click')
    expect(hamburgerBtn.attributes('aria-expanded')).toBe('false')
  })

  it('closes mobile menu when a nav link is clicked', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          NuxtLink: {
            template:
              '<a :href="to" v-bind="$attrs"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const hamburgerBtn = wrapper.find(
      'button[aria-label="Abrir menú de navegación"]'
    )

    // Open the menu first
    await hamburgerBtn.trigger('click')
    expect(hamburgerBtn.attributes('aria-expanded')).toBe('true')

    // Click a link in the mobile menu — should close the menu
    const mobileMenu = wrapper.find('.border-t')
    expect(mobileMenu.exists()).toBe(true)

    const firstLink = mobileMenu.find('a')
    await firstLink.trigger('click')

    // Menu should be closed after link click
    expect(hamburgerBtn.attributes('aria-expanded')).toBe('false')
  })
})
