import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IndexPage from '../../../app/pages/index.vue'
import PageHero from '../../../app/components/PageHero.vue'
import BaseCard from '../../../app/components/BaseCard.vue'
import BaseButton from '../../../app/components/BaseButton.vue'

// Stub NuxtLink as it's a Nuxt auto-import
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

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
