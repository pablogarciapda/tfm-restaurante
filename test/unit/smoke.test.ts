import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '../../app/pages/index.vue'
import PageHero from '../../app/components/PageHero.vue'
import BaseCard from '../../app/components/BaseCard.vue'
import BaseButton from '../../app/components/BaseButton.vue'

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('Unit Smoke — Home Page', () => {
  it('mounts and contains expected Spanish text', () => {
    const wrapper = mount(Home, {
      global: {
        components: { PageHero, BaseCard, BaseButton },
        stubs: { NuxtLink: NuxtLinkStub },
      },
    })

    expect(wrapper).toBeTruthy()
    expect(wrapper.text()).toContain('Restaurante La Zíngara')
  })
})
