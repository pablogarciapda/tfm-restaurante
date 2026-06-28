import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '../../app/pages/index.vue'

describe('Unit Smoke — Home Page', () => {
  it('mounts and contains expected Spanish text', () => {
    const wrapper = mount(Home)

    expect(wrapper).toBeTruthy()
    expect(wrapper.text()).toContain('Restaurante La Zíngara')
  })
})
