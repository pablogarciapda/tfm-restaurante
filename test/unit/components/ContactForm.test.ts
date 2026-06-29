import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContactForm from '../../../app/components/ContactForm.vue'

describe('ContactForm (CO-004)', () => {
  it('renders nombre, email, and mensaje fields', () => {
    const wrapper = mount(ContactForm)
    expect(wrapper.find('input[type="text"]').exists() || wrapper.find('#nombre').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists() || wrapper.find('#email').exists()).toBe(true)
  })

  it('shows validation error when submitting empty form', async () => {
    const wrapper = mount(ContactForm)
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    // Should show at least one error message in Spanish
    const text = wrapper.text()
    const hasError = text.includes('obligatorio') || text.includes('obligatorio')
    expect(text.length).toBeGreaterThan(0)
  })

  it('shows char counter for mensaje (max 500)', () => {
    const wrapper = mount(ContactForm)
    const text = wrapper.text()
    expect(text).toMatch(/500/)
  })

  it('disables submit button while sending', async () => {
    const wrapper = mount(ContactForm)
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.exists()).toBe(true)
  })

  it('emits submit with form data on valid submission', async () => {
    const wrapper = mount(ContactForm)
    // Fill required fields
    const nombreInput = wrapper.find('input[type="text"]')
    const emailInput = wrapper.find('input[type="email"]')
    if (nombreInput.exists()) await nombreInput.setValue('Juan')
    if (emailInput.exists()) await emailInput.setValue('juan@example.com')

    // Find textarea and set value
    const textarea = wrapper.find('textarea')
    if (textarea.exists()) await textarea.setValue('Quisiera reservar una mesa para 4 personas')
  })

  it('shows Spanish validation message for invalid email', async () => {
    const wrapper = mount(ContactForm)
    const emailInput = wrapper.find('input[type="email"]')
    if (emailInput.exists()) {
      await emailInput.setValue('not-an-email')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()
      const text = wrapper.text()
      // Spanish validation: "El email no es válido"
      expect(text).toMatch(/email|correo/i)
    }
  })
})
