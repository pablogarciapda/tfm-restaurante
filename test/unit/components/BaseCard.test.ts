import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCard from '../../../app/components/BaseCard.vue'

/**
 * RED → GREEN → TRIANGULATE — BaseCard (PU-006)
 *
 * PU-006 scenarios:
 * - Slot content renders inside styled card
 * - Optional image prop renders at top with object-cover
 */

describe('BaseCard — Slot content', () => {
  it('renders default slot content inside the card', () => {
    const wrapper = mount(BaseCard, {
      slots: { default: '<h3>Plato del día</h3>' },
    })

    expect(wrapper.html()).toContain('<h3>Plato del día</h3>')
    expect(wrapper.text()).toBe('Plato del día')
  })

  it('renders complex slot content with multiple elements', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        default: `
          <h3>Título</h3>
          <p>Descripción larga del plato con más detalles.</p>
          <span class="price">22€</span>
        `,
      },
    })

    expect(wrapper.text()).toContain('Título')
    expect(wrapper.text()).toContain('Descripción larga')
    expect(wrapper.text()).toContain('22€')
  })
})

describe('BaseCard — Image prop', () => {
  it('renders no image when image prop is not provided', () => {
    const wrapper = mount(BaseCard, {
      slots: { default: 'Content' },
    })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(false)
  })

  it('renders an image when image prop is provided', () => {
    const wrapper = mount(BaseCard, {
      props: { image: '/images/carta.jpg', imageAlt: 'Plato' },
      slots: { default: 'Content' },
    })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('/images/carta.jpg')
    expect(img.attributes('alt')).toBe('Plato')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('renders image above slot content', () => {
    const wrapper = mount(BaseCard, {
      props: { image: '/images/carta.jpg', imageAlt: 'Plato' },
      slots: { default: '<p>Card content</p>' },
    })

    const img = wrapper.get('img')
    const content = wrapper.get('p')

    // Image element should appear before content element in the DOM
    const html = wrapper.html()
    const imgIndex = html.indexOf('<img')
    const contentIndex = html.indexOf('<p>Card')
    expect(imgIndex).toBeLessThan(contentIndex)
  })
})
