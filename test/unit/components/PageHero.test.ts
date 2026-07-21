import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHero from '../../../app/components/PageHero.vue'

/**
 * RED → GREEN → TRIANGULATE — PageHero (PU-007)
 *
 * PU-007 scenarios:
 * - title renders as <h1>
 * - optional subtitle
 * - optional background image (cover, dark overlay)
 */

describe('PageHero — Title', () => {
  it('renders title inside an <h1> element', () => {
    const wrapper = mount(PageHero, {
      props: { title: 'Nuestra Carta' },
    })

    const h1 = wrapper.get('h1')
    expect(h1.text()).toBe('Nuestra Carta')
  })

  it('renders different title text', () => {
    const wrapper = mount(PageHero, {
      props: { title: 'Menú del Día' },
    })

    expect(wrapper.get('h1').text()).toBe('Menú del Día')
  })
})

describe('PageHero — Subtitle', () => {
  it('does not render subtitle when prop is not provided', () => {
    const wrapper = mount(PageHero, {
      props: { title: 'Solo título' },
    })

    expect(wrapper.text()).not.toContain('Subtítulo')
    // No <p> with subtitle content
    const paragraphs = wrapper.findAll('p')
    const hasSubtitle = paragraphs.some(
      (p) => p.text() === 'Subtítulo opcional'
    )
    expect(hasSubtitle).toBe(false)
  })

  it('renders subtitle when subtitle prop is provided', () => {
    const wrapper = mount(PageHero, {
      props: {
        title: 'Eventos',
        subtitle: 'Próximos eventos',
      },
    })

    expect(wrapper.text()).toContain(
      'Próximos eventos'
    )
  })
})

describe('PageHero — Background image', () => {
  it('does not render background section when no background prop', () => {
    const wrapper = mount(PageHero, {
      props: { title: 'Sin fondo' },
    })

    const bgImage = wrapper.find('[data-testid="hero-background"]')
    expect(bgImage.exists()).toBe(false)
  })

  it('renders background image when background prop is provided', () => {
    const wrapper = mount(PageHero, {
      props: {
        title: 'Con fondo',
        background: '/images/hero.jpg',
      },
    })

    const section = wrapper.get('[data-testid="hero-background"]')
    expect(section.exists()).toBe(true)
  })
})
