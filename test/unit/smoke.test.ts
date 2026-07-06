import { describe, it, expect, vi } from 'vitest'
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

vi.stubGlobal('useSupabaseClient', () => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
}))

vi.stubGlobal('useAsyncData', () => ({
  data: { value: null },
  error: null,
  pending: { value: false },
}))

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
