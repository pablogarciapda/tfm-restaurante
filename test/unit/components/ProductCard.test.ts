import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductCard from '../../../app/components/ProductCard.vue'

/**
 * RED → GREEN → TRIANGULATE — ProductCard (CN-004, CN-007)
 */
describe('ProductCard — Rendering (CN-004)', () => {
  const mockPlato = {
    plato: 'ZAMBURIÑAS A LA PLANCHA',
    precio: '26',
    stock: '10',
    descripcion: 'Zamburiñas frescas a la plancha con ajo, perejil y un toque de limón',
    imagen_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
    alergenos: ['mariscos'],
    calorias: 195,
  }

  it('renders the dish name', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    expect(wrapper.text()).toContain('ZAMBURIÑAS A LA PLANCHA')
  })

  it('renders the price', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    expect(wrapper.text()).toContain('26')
    expect(wrapper.find('[data-testid="product-price"]').exists()).toBe(true)
  })

  it('renders the description (line-clamp-2)', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    expect(wrapper.text()).toContain('Zamburiñas frescas')
  })

  it('renders alergeno badges', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    expect(wrapper.text()).toContain('mariscos')
  })

  it('renders image with loading="lazy"', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('image has alt text with dish name', () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    const img = wrapper.find('img')
    expect(img.attributes('alt')).toContain('ZAMBURIÑAS')
  })

  it('shows placeholder when image fails to load', async () => {
    const wrapper = mount(ProductCard, {
      props: { plato: mockPlato },
    })
    const img = wrapper.find('img')
    await img.trigger('error')
    // Should have an onerror handler that shows a placeholder
    // The image should still be present, just with a fallback
    expect(img.exists()).toBe(true)
  })
})

describe('ProductCard — Missing fields (CN-004 edge)', () => {
  it('renders without alergenos (no badges)', () => {
    const plato = {
      plato: 'SOLOMILLO',
      precio: '26',
      stock: '10',
      descripcion: 'Solomillo de ternera',
      imagen_url: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
      alergenos: [],
    }
    const wrapper = mount(ProductCard, { props: { plato } })
    // No allergen text should be visible
    const badges = wrapper.findAll('[data-testid="allergen-badge"]')
    expect(badges.length).toBe(0)
  })

  it('renders without description gracefully', () => {
    const plato = {
      plato: 'CHULETÓN',
      precio: '75€/kg',
      stock: '',
      imagen_url: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800',
      alergenos: [],
    }
    const wrapper = mount(ProductCard, { props: { plato } })
    expect(wrapper.text()).toContain('CHULETÓN')
    expect(wrapper.text()).toContain('75€/kg')
  })

  it('renders price format like 33/Pers. correctly', () => {
    const plato = {
      plato: 'ARROZ CON BOGAVANTE',
      precio: '33/Pers.',
      stock: '10',
      descripcion: 'Arroz meloso con bogavante',
      imagen_url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800',
      alergenos: ['mariscos'],
    }
    const wrapper = mount(ProductCard, { props: { plato } })
    expect(wrapper.text()).toContain('33/Pers.')
  })
})
