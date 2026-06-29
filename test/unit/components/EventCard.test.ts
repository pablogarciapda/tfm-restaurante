import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EventCard from '../../../app/components/EventCard.vue'
import BaseButton from '../../../app/components/BaseButton.vue'

// Stub NuxtLink
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const globalConfig = {
  components: { BaseButton },
  stubs: { NuxtLink: NuxtLinkStub },
}

describe('EventCard (EG-002, EG-004)', () => {
  const futureEvent = {
    id: 'evt-1',
    fecha: '2027-08-15',
    titulo: 'Noche de Flamenco',
    descripcion: 'Espectáculo de flamenco con cante, baile y guitarra en directo.',
    imagen_url: 'https://images.unsplash.com/photo-1516306580123-e6e52b5b5b2c?w=800',
    categoria: 'espectaculo' as const,
  }

  const soldOutEvent = {
    id: 'evt-2',
    fecha: '2027-09-01',
    titulo: 'Cena bajo las estrellas',
    descripcion: 'Cena al aire libre.',
    categoria: 'festivo' as const,
    soldOut: true,
  }

  const pastEvent = {
    id: 'evt-3',
    fecha: '2025-12-31',
    titulo: 'Cena de Nochevieja',
    descripcion: 'Celebración de fin de año.',
    categoria: 'festivo' as const,
  }

  it('renders event title', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Noche de Flamenco')
  })

  it('renders formatted date in Spanish', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    // Date formatted as "DD de Mes" in Spanish
    expect(wrapper.text()).toMatch(/agosto|Agosto/)
  })

  it('renders description', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('flamenco')
  })

  it('renders image with loading="lazy"', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('renders "Reservar" button linking to /reservas', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Reservar')
    const btn = wrapper.findComponent(BaseButton)
    expect(btn.exists()).toBe(true)
  })

  it('shows "Agotado" badge for sold-out events', () => {
    const wrapper = mount(EventCard, {
      props: { evento: soldOutEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Agotado')
  })

  it('shows "Evento pasado" badge for past events', () => {
    const wrapper = mount(EventCard, {
      props: { evento: pastEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Evento pasado')
  })

  it('renders category badge (festivo or espectaculo)', () => {
    const wrapper = mount(EventCard, {
      props: { evento: futureEvent },
      global: globalConfig,
    })
    expect(wrapper.text()).toMatch(/Espectáculo|Festivo/)
  })
})
