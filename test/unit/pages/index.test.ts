import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import IndexPage from '../../../app/pages/index.vue'
import PageHero from '../../../app/components/PageHero.vue'
import BaseCard from '../../../app/components/BaseCard.vue'
import BaseButton from '../../../app/components/BaseButton.vue'

// Stub Nuxt auto-imports
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const mockRestaurant = ref({
  nombre: 'Restaurante La Zíngara',
  direccion: '',
  telefono: '',
  maps_url: '',
  logo_url: null,
  site_url: '',
  email: '',
  instagram_url: '',
  facebook_url: '',
  poblacion: 'Santa María del Páramo, León',
})

vi.stubGlobal('useRestaurantConfig', () => ({
  restaurant: mockRestaurant,
  direccionLineas: computed(() => mockRestaurant.value.direccion.split(',').map((s: string) => s.trim())),
  logoUrl: ref('/images/logo.png'),
  nombre: computed(() => mockRestaurant.value.nombre),
  telefono: computed(() => mockRestaurant.value.telefono),
  mapsUrl: computed(() => mockRestaurant.value.maps_url),
  siteUrl: computed(() => mockRestaurant.value.site_url),
  email: computed(() => mockRestaurant.value.email),
  instagramUrl: computed(() => mockRestaurant.value.instagram_url),
  facebookUrl: computed(() => mockRestaurant.value.facebook_url),
  poblacion: computed(() => mockRestaurant.value.poblacion),
}))

vi.stubGlobal('useSupabaseClient', () => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
}))

vi.stubGlobal('useAsyncData', () => ({
  data: { value: null },
  error: null,
  pending: { value: false },
}))

const globalComponents = {
  PageHero,
  BaseCard,
  BaseButton,
}

describe('Index page (Home) — rewrite (PU-007, 2.3.1)', () => {
  const mountOptions = {
    global: {
      components: globalComponents,
      stubs: { NuxtLink: NuxtLinkStub },
    },
  }

  it('renders PageHero with restaurant title', () => {
    const wrapper = mount(IndexPage, mountOptions)
    expect(wrapper.text()).toContain('Restaurante La Zíngara')
  })

  it('renders subtitle with location', () => {
    const wrapper = mount(IndexPage, mountOptions)
    expect(wrapper.text()).toContain('Santa María del Páramo')
    expect(wrapper.text()).toContain('León')
  })

  it('renders card content for all 5 public pages', () => {
    const wrapper = mount(IndexPage, mountOptions)
    const text = wrapper.text()
    expect(text).toContain('Carta')
    expect(text).toContain('Menú del Día')
    expect(text).toContain('Reservas')
    expect(text).toContain('Eventos')
    expect(text).toContain('Contacto')
  })

  it('has NuxtLinks pointing to correct routes', () => {
    const wrapper = mount(IndexPage, mountOptions)
    const links = wrapper.findAll('a')
    const routes = ['/carta', '/menu-diario', '/reservas', '/eventos', '/contacto']
    for (const route of routes) {
      const link = links.find((a) => a.attributes('href') === route)
      expect(link?.exists()).toBe(true)
    }
  })

  it('each card has "Ver más" button', () => {
    const wrapper = mount(IndexPage, mountOptions)
    const text = wrapper.text()
    const verMasCount = (text.match(/Ver más/g) || []).length
    expect(verMasCount).toBe(5)
  })
})
