import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import ContactoPage from '../../../app/pages/contacto.vue'
import ContactForm from '../../../app/components/ContactForm.vue'
import MapEmbed from '../../../app/components/MapEmbed.vue'
import PageHero from '../../../app/components/PageHero.vue'

const mockRestaurant = ref({
  nombre: 'Restaurante La Zíngara',
  direccion: 'Avda. del Páramo, 11, 24240 Santa María del Páramo, León',
  telefono: '987 350 350',
  maps_url: 'https://maps.app.goo.gl/56uxryZVZkS3pKTMA',
  logo_url: null,
  site_url: 'https://www.lazingara.es',
  email: 'reservas@lazingara.es',
  instagram_url: 'https://www.instagram.com/restaurantelazingaraoficial',
  facebook_url: 'https://www.facebook.com/RestauranteLaZingara',
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

vi.stubGlobal('$fetch', () =>
  Promise.resolve({
    horarios: {
      comida_inicio: '13:30',
      comida_fin: '15:30',
      cena_inicio: '21:00',
      cena_fin: '23:30',
      intervalo_minutos: 15,
    },
  }),
)

describe('Contacto page (CO-001, CO-003, CO-004)', () => {
  const mountOptions = {
    global: { components: { ContactForm, MapEmbed, PageHero } },
  }

  it('renders PageHero', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    expect(wrapper.text()).toContain('Contacto')
  })

  it('displays business hours (CO-001)', async () => {
    const wrapper = mount(ContactoPage, mountOptions)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Horario')
    expect(text).toContain('Comida')
    expect(text).toContain('Cena')
  })

  it('has clickable phone tel: link (CO-003)', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    const telLink = wrapper.find('a[href^="tel:"]')
    expect(telLink.exists()).toBe(true)
  })

  it('has clickable email mailto: link (CO-003)', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    const mailLink = wrapper.find('a[href^="mailto:"]')
    expect(mailLink.exists()).toBe(true)
  })

  it('renders MapEmbed and ContactForm', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    expect(wrapper.findComponent(MapEmbed).exists()).toBe(true)
    expect(wrapper.findComponent(ContactForm).exists()).toBe(true)
  })
})
