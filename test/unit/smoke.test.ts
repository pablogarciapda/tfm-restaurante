import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import Home from '../../app/pages/index.vue'
import PageHero from '../../app/components/PageHero.vue'
import BaseCard from '../../app/components/BaseCard.vue'
import BaseButton from '../../app/components/BaseButton.vue'

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

describe('Unit Smoke — Home Page', () => {
  it('mounts and contains expected Spanish text', () => {
    const wrapper = mount(Home, {
      global: {
        components: { PageHero, BaseCard, BaseButton },
        stubs: { NuxtLink: NuxtLinkStub },
      },
    })

    expect(wrapper).toBeTruthy()
    expect(wrapper.text()).toContain('Restaurante La Zíngara')
  })
})
