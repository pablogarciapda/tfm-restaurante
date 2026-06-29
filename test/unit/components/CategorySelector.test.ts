import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CategorySelector from '../../../app/components/CategorySelector.vue'

/**
 * RED → GREEN → TRIANGULATE — CategorySelector (CN-001, CN-002)
 *
 * CN-001 scenarios:
 * - Desktop arrows appear when categories overflow
 * - Arrow scrolls categories
 * - Mobile touch scroll
 * - Active indicator: underline or color change
 */
describe('CategorySelector — Rendering (CN-001)', () => {
  const categories = ['ENSALADAS', 'ENTRANTES CALIENTES', 'PESCADOS', 'CARNES']

  it('renders all categories as buttons', () => {
    const wrapper = mount(CategorySelector, {
      props: { categories, modelValue: 'ENSALADAS' },
    })
    for (const cat of categories) {
      expect(wrapper.text()).toContain(cat)
    }
  })

  it('applies active background to the selected category', () => {
    const wrapper = mount(CategorySelector, {
      props: { categories, modelValue: 'PESCADOS' },
    })
    const activeBtn = wrapper.find('[data-testid="category-btn-PESCADOS"]')
    expect(activeBtn.exists()).toBe(true)
    // Active button should have terracotta background + white text
    const classes = activeBtn.classes()
    expect(classes).toContain('bg-terracotta')
    expect(classes).toContain('text-white')
  })

  it('non-active categories do not have the active background', () => {
    const wrapper = mount(CategorySelector, {
      props: { categories, modelValue: 'PESCADOS' },
    })
    const inactiveBtn = wrapper.find('[data-testid="category-btn-ENSALADAS"]')
    expect(inactiveBtn.exists()).toBe(true)
    // Should NOT have the active background (bg-terracotta) as a standalone class
    const classes = inactiveBtn.classes()
    expect(classes).not.toContain('bg-terracotta')
  })

  it('emits update:modelValue when a category is clicked', async () => {
    const wrapper = mount(CategorySelector, {
      props: { categories, modelValue: 'ENSALADAS' },
    })
    const btn = wrapper.find('[data-testid="category-btn-CARNES"]')
    await btn.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual(['CARNES'])
  })

  it('renders left/right arrow buttons for desktop', () => {
    const wrapper = mount(CategorySelector, {
      props: { categories, modelValue: 'ENSALADAS' },
    })
    const leftArrow = wrapper.find('[data-testid="scroll-left"]')
    const rightArrow = wrapper.find('[data-testid="scroll-right"]')
    expect(leftArrow.exists()).toBe(true)
    expect(rightArrow.exists()).toBe(true)
    expect(leftArrow.attributes('aria-label')).toBeTruthy()
    expect(rightArrow.attributes('aria-label')).toBeTruthy()
  })
})

describe('CategorySelector — v-model binding (CN-002)', () => {
  it('works with v-model to change active category externally', async () => {
    const categories = ['ENSALADAS', 'ENTRANTES', 'PESCADOS']

    // Parent-like test using ref
    const active = ref('ENSALADAS')
    const wrapper = mount({
      components: { CategorySelector },
      template: `<CategorySelector v-model="active" :categories="cats" />`,
      setup() {
        return { active, cats: categories }
      },
    })

    expect(wrapper.find('[data-testid="category-btn-ENSALADAS"]').classes()).toContain('bg-terracotta')

    active.value = 'PESCADOS'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="category-btn-PESCADOS"]').classes()).toContain('bg-terracotta')
  })

  it('renders correctly with a single category (edge case)', () => {
    const wrapper = mount(CategorySelector, {
      props: { categories: ['ENSALADAS'], modelValue: 'ENSALADAS' },
    })
    expect(wrapper.find('[data-testid="category-btn-ENSALADAS"]').exists()).toBe(true)
  })
})
