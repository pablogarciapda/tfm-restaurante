import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MapEmbed from '../../../app/components/MapEmbed.vue'

describe('MapEmbed (CO-002)', () => {
  it('renders iframe with loading="lazy"', () => {
    const wrapper = mount(MapEmbed, {
      props: { src: 'https://maps.google.com', title: 'Mapa del restaurante' },
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('loading')).toBe('lazy')
  })

  it('has title attribute for accessibility', () => {
    const wrapper = mount(MapEmbed, {
      props: { src: 'https://maps.google.com', title: 'Mapa del restaurante' },
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('title')).toBe('Mapa del restaurante')
  })

  it('renders fallback text below the iframe', () => {
    const wrapper = mount(MapEmbed, {
      props: { src: 'https://maps.google.com', title: 'Mapa' },
    })
    expect(wrapper.text()).toMatch(/mapa|ubicación/i)
  })
})
