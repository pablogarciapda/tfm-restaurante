import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductGrid from '../../../app/components/ProductGrid.vue'
import ProductCard from '../../../app/components/ProductCard.vue'
import SectionDivider from '../../../app/components/SectionDivider.vue'

const globalComponents = {
  ProductCard,
  SectionDivider,
}

/**
 * RED → GREEN → TRIANGULATE — ProductGrid (CN-003, CN-005, CN-006)
 *
 * CN-003: responsive CSS Grid 1/2/3/4 cols
 * CN-005: empty-precio platos render as SectionDivider, NOT ProductCard
 * CN-006: groups by category
 */
describe('ProductGrid — Rendering (CN-003)', () => {
  // Mock categories from carta-mock.ts structure
  const categories = [
    {
      id: 'cat1',
      categoria: 'ENSALADAS',
      puesto: 1,
      open: false,
      platos: [
        {
          plato: 'ENSALADA ZÍNGARA',
          precio: '18',
          stock: '12',
          descripcion: 'Mezcla de lechugas con queso',
          imagen_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
          alergenos: ['lactosa'],
          calorias: 340,
        },
        {
          plato: 'ENSALADA MIXTA',
          precio: '13',
          stock: '10',
          descripcion: 'Lechuga, tomate, cebolla, atún',
          imagen_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
          alergenos: [],
          calorias: 220,
        },
      ],
    },
    {
      id: 'cat2',
      categoria: 'PESCADOS',
      puesto: 2,
      open: false,
      platos: [
        {
          plato: 'RODABALLO PLANCHA',
          precio: '22',
          stock: '',
          descripcion: 'Rodaballo fresco a la plancha',
          imagen_url: 'https://images.unsplash.com/photo-1601314002592-b8734bca6604?w=800',
          alergenos: [],
          calorias: 280,
        },
      ],
    },
  ]

  it('renders ProductCard for priced platos', () => {
    const wrapper = mount(ProductGrid, {
      props: { categories },
      global: { components: globalComponents },
    })
    const cards = wrapper.findAllComponents(ProductCard)
    // 2 from ENSALADAS + 1 from PESCADOS = 3 ProductCards
    expect(cards.length).toBe(3)
  })

  it('renders category headers', () => {
    const wrapper = mount(ProductGrid, {
      props: { categories },
      global: { components: globalComponents },
    })
    expect(wrapper.text()).toContain('ENSALADAS')
    expect(wrapper.text()).toContain('PESCADOS')
  })
})

describe('ProductGrid — Divider handling (CN-005)', () => {
  it('renders SectionDivider for empty-precio platos (not ProductCard)', () => {
    const categories = [
      {
        id: 'cat1',
        categoria: 'NUESTRAS RECOMENDACIONES',
        puesto: 0,
        open: false,
        platos: [
          {
            plato: 'ZAMBURIÑAS',
            precio: '26',
            stock: '10',
            descripcion: 'Zamburiñas frescas',
            imagen_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
            alergenos: ['mariscos'],
            calorias: 195,
          },
          { precio: '', plato: '— CARNES —', stock: '10' },
          {
            plato: 'LECHAZO ASADO',
            precio: '22',
            stock: '10',
            descripcion: 'Lechazo asado',
            imagen_url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
            alergenos: [],
            calorias: 680,
          },
        ],
      },
    ]

    const wrapper = mount(ProductGrid, {
      props: { categories },
      global: { components: globalComponents },
    })

    // The divider plato should render as SectionDivider, not ProductCard
    const dividers = wrapper.findAllComponents(SectionDivider)
    expect(dividers.length).toBeGreaterThanOrEqual(1)
    expect(dividers[0].props('label')).toBe('— CARNES —')

    // Only 2 priced platos should be ProductCards
    const cards = wrapper.findAllComponents(ProductCard)
    expect(cards.length).toBe(2)
  })

  it('does not render a ProductCard for the divider item', () => {
    const categories = [
      {
        id: 'cat1',
        categoria: 'RECOMENDACIONES',
        puesto: 0,
        open: false,
        platos: [
          { precio: '', plato: '— PESCADOS —', stock: '10' },
          {
            plato: 'MERLUZA',
            precio: '20',
            stock: '',
            descripcion: 'Merluza fresca',
            imagen_url: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800',
            alergenos: [],
            calorias: 310,
          },
        ],
      },
    ]

    const wrapper = mount(ProductGrid, {
      props: { categories },
      global: { components: globalComponents },
    })

    const dividerText = wrapper.text()
    expect(dividerText).toContain('— PESCADOS —')
    // Should have exactly 1 ProductCard (the Merluza)
    expect(wrapper.findAllComponents(ProductCard).length).toBe(1)
  })
})

describe('ProductGrid — Grid classes (CN-003)', () => {
  it('renders with responsive grid classes', () => {
    const categories = [
      {
        id: 'cat1',
        categoria: 'CARNES',
        puesto: 0,
        open: false,
        platos: [
          {
            plato: 'CHULETÓN',
            precio: '75€/kg',
            stock: '',
            descripcion: 'Chuletón de vaca',
            imagen_url: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800',
            alergenos: [],
            calorias: 820,
          },
        ],
      },
    ]

    const wrapper = mount(ProductGrid, {
      props: { categories },
      global: { components: globalComponents },
    })

    // Find the grid container (not the section wrapper)
    const grid = wrapper.find('[data-testid="product-grid"]')
    expect(grid.exists()).toBe(true)
    const classes = grid.classes()
    expect(classes).toContain('grid')
  })
})
