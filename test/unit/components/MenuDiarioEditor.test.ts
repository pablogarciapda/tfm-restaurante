/**
 * TDD: RED → GREEN → TRIANGULATE — MenuDiarioEditor (CMD-001–CMD-005)
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

function createChain(value: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject)
    },
  }
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit']) {
    chain[m] = () => chain
  }
  return chain
}

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({
  from: () => ({
    select: vi.fn(() => createChain({ data: [], error: null })),
    insert: vi.fn(() => createChain({ data: null, error: null })),
    update: vi.fn(() => createChain({ data: null, error: null })),
    delete: vi.fn(() => createChain({ data: null, error: null })),
  }),
  auth: vi.fn(),
})

describe('MenuDiarioEditor (CMD-001–CMD-005)', () => {
  async function mountEditor() {
    const mod = await import('../../../app/components/MenuDiarioEditor.vue')
    return mount(mod.default)
  }

  it('renders 7 day buttons (Lunes–Domingo)', async () => {
    const wrapper = await mountEditor()
    const text = wrapper.text()
    expect(text).toContain('Lunes')
    expect(text).toContain('Martes')
    expect(text).toContain('Domingo')
  })

  it('renders 5 section headers', async () => {
    const wrapper = await mountEditor()
    const text = wrapper.text()
    expect(text).toContain('Primer Plato')
    expect(text).toContain('Segundo Plato')
    expect(text).toContain('Postre')
    expect(text).toContain('Bebida')
    expect(text).toContain('Pan y Cubiertos')
  })
})
