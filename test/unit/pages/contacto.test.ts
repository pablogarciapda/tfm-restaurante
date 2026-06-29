import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContactoPage from '../../../app/pages/contacto.vue'
import ContactForm from '../../../app/components/ContactForm.vue'
import MapEmbed from '../../../app/components/MapEmbed.vue'
import PageHero from '../../../app/components/PageHero.vue'

describe('Contacto page (CO-001, CO-003, CO-004)', () => {
  const mountOptions = {
    global: { components: { ContactForm, MapEmbed, PageHero } },
  }

  it('renders PageHero', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    expect(wrapper.text()).toContain('Contacto')
  })

  it('displays business hours (CO-001)', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    const text = wrapper.text()
    expect(text).toContain('Horario')
    expect(text).toMatch(/Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo/)
  })

  it('has clickable phone tel: link (CO-003)', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    const telLink = wrapper.find('a[href^="tel:"]')
    expect(telLink.exists()).toBe(true)
  })

  it('has clickable email mailto: link (CO-003)', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    const mailLink = wrapper.find('a[href^="mailto:"]')
    expect(mailLink.exists()).toBe(true)
  })

  it('renders MapEmbed and ContactForm', () => {
    const wrapper = mount(ContactoPage, mountOptions)
    expect(wrapper.findComponent(MapEmbed).exists()).toBe(true)
    expect(wrapper.findComponent(ContactForm).exists()).toBe(true)
  })
})
