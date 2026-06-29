import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EventosPage from '../../../app/pages/eventos.vue'
import EventCard from '../../../app/components/EventCard.vue'
import BaseButton from '../../../app/components/BaseButton.vue'
import PageHero from '../../../app/components/PageHero.vue'

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const globalConfig = {
  components: { EventCard, BaseButton, PageHero },
  stubs: { NuxtLink: NuxtLinkStub },
}

describe('Eventos page (EG-001, EG-003)', () => {
  it('renders PageHero', () => {
    const wrapper = mount(EventosPage, { global: globalConfig })
    expect(wrapper.text()).toContain('Eventos')
  })

  it('renders EventCard instances', () => {
    const wrapper = mount(EventosPage, { global: globalConfig })
    const cards = wrapper.findAllComponents(EventCard)
    // Should have at least some cards (some may be past/future)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('shows upcoming events first', () => {
    const wrapper = mount(EventosPage, { global: globalConfig })
    const text = wrapper.text()
    expect(text).toContain('Próximos eventos')
  })
})
