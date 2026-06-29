import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CartaPage from '../../../app/pages/carta.vue'
import CategorySelector from '../../../app/components/CategorySelector.vue'
import ProductGrid from '../../../app/components/ProductGrid.vue'
import ProductCard from '../../../app/components/ProductCard.vue'
import SectionDivider from '../../../app/components/SectionDivider.vue'
import PageHero from '../../../app/components/PageHero.vue'

const globalComponents = {
  CategorySelector,
  ProductGrid,
  ProductCard,
  SectionDivider,
  PageHero,
}

describe('Carta page (CN-001, CN-002, CN-006)', () => {
  it('renders PageHero with Carta title', () => {
    const wrapper = mount(CartaPage, {
      global: { components: globalComponents },
    })
    expect(wrapper.text()).toContain('Nuestra Carta')
  })

  it('renders CategorySelector', () => {
    const wrapper = mount(CartaPage, {
      global: { components: globalComponents },
    })
    expect(wrapper.findComponent(CategorySelector).exists()).toBe(true)
  })

  it('renders ProductGrid', () => {
    const wrapper = mount(CartaPage, {
      global: { components: globalComponents },
    })
    expect(wrapper.findComponent(ProductGrid).exists()).toBe(true)
  })

  it('passes filtered categories to ProductGrid based on active category', async () => {
    const wrapper = mount(CartaPage, {
      global: { components: globalComponents },
    })
    // ProductGrid should receive categories prop
    const grid = wrapper.findComponent(ProductGrid)
    expect(grid.exists()).toBe(true)
    expect(grid.props('categories')).toBeTruthy()
    expect(grid.props('categories').length).toBeGreaterThan(0)
  })

  it('CategorySelector has v-model bound to active category ref', async () => {
    const wrapper = mount(CartaPage, {
      global: { components: globalComponents },
    })
    const selector = wrapper.findComponent(CategorySelector)
    expect(selector.exists()).toBe(true)
    // modelValue should be the first category
    expect(selector.props('modelValue')).toBeTruthy()
  })
})
