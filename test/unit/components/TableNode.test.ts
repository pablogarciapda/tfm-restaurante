/**
 * TDD: RED → GREEN → TRIANGULATE — TableNode component (MCA-005, AD-11)
 *
 * Renders a single table as v-group containing:
 *   v-rect (status-colored fill, shadow, corner radius)
 *   v-text ("Mesa {n}")
 *   v-text ("{capacidad} pax")
 *
 * Status colors: libre=#22C55E, ocupada=#EF4444, reservada=#F59E0B
 * Selected: #C67B5C (terracotta)
 * Fused tables: strokeDash=[5,5]
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import type { Mesa, MesaEstado } from '../../../shared/contracts/mesas.contract'

// ── Mock vue-konva at module level ──
vi.mock('vue-konva', () => ({
  Rect: defineComponent({
    props: ['config'],
    setup(props) {
      return () => h('div', {
        'data-testid': 'v-rect',
        'data-fill': String(props.config?.fill ?? ''),
        'data-stroke': String(props.config?.stroke ?? ''),
        'data-strokewidth': String(props.config?.strokeWidth ?? ''),
        'data-cornerradius': String(props.config?.cornerRadius ?? ''),
        'data-shadowblur': String(props.config?.shadowBlur ?? ''),
        'data-perfectdraw': String(props.config?.perfectDrawEnabled ?? ''),
        'data-strokedash': String(props.config?.strokeDash ?? ''),
        'data-width': String(props.config?.width ?? ''),
        'data-height': String(props.config?.height ?? ''),
      })
    },
  }),
  Circle: defineComponent({
    props: ['config'],
    setup(props) {
      return () => h('div', {
        'data-testid': 'v-circle',
        'data-radius': String(props.config?.radius ?? ''),
        'data-fill': String(props.config?.fill ?? ''),
        'data-stroke': String(props.config?.stroke ?? ''),
        'data-strokedash': String(props.config?.strokeDash ?? ''),
      })
    },
  }),
  Ellipse: defineComponent({
    props: ['config'],
    setup(props) {
      return () => h('div', {
        'data-testid': 'v-ellipse',
        'data-radiusx': String(props.config?.radiusX ?? ''),
        'data-radiusy': String(props.config?.radiusY ?? ''),
        'data-fill': String(props.config?.fill ?? ''),
        'data-stroke': String(props.config?.stroke ?? ''),
        'data-strokedash': String(props.config?.strokeDash ?? ''),
      })
    },
  }),
  Text: defineComponent({
    props: ['config'],
    setup(props) {
      return () => h('div', {
        'data-testid': 'v-text',
        'data-text': String(props.config?.text ?? ''),
        'data-fontsize': String(props.config?.fontSize ?? ''),
        'data-fill': String(props.config?.fill ?? ''),
      })
    },
  }),
  Group: defineComponent({
    props: ['config'],
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': 'v-group' }, slots.default?.())
    },
  }),
  Layer: defineComponent({
    props: ['config'],
    setup(_props, { slots }) {
      return () => h('div', { 'data-testid': 'v-layer' }, slots.default?.())
    },
  }),
  Stage: defineComponent({
    props: ['config'],
    setup(_props, { slots }) {
      return () => h('div', { 'data-testid': 'v-stage' }, slots.default?.())
    },
  }),
  Transformer: defineComponent({
    props: ['config'],
    setup() {
      return () => h('div', { 'data-testid': 'v-transformer' })
    },
  }),
}))

// --- Helpers ---

function makeMesa(overrides: Partial<Mesa> & { id: string }): Mesa {
  return {
    numero_mesa: 1,
    capacidad_base: 4,
    posicion_x: 100,
    posicion_y: 200,
    ancho: 120,
    alto: 80,
    rotacion: 0,
    zona: 'Principal',
    forma: 'rectangular',
    mesa_padre_id: null,
    id_fusion: null,
    capacidad_actual: 4,
    created_at: '2026-06-30T10:00:00.000Z',
    updated_at: '2026-06-30T10:00:00.000Z',
    ...overrides,
  }
}

// ============================================================================
// TableNode Tests
// ============================================================================

describe('TableNode — renders group with rect + 2 texts', () => {
  async function mountNode(options: {
    mesa?: Mesa
    estado?: MesaEstado
    selected?: boolean
  } = {}) {
    const mod = await import('../../../app/features/mesas/components/TableNode.vue')
    return mount(mod.default, {
      props: {
        mesa: options.mesa ?? makeMesa({ id: 'a' }),
        estado: options.estado ?? 'libre',
        selected: options.selected ?? false,
      },
    })
  }

  describe('structural elements', () => {
    it('renders a v-group container', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-group"]').exists()).toBe(true)
    })

    it('renders a v-rect inside the group', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').exists()).toBe(true)
    })

    it('renders two v-text elements (numero + capacidad)', async () => {
      const wrapper = await mountNode()
      const texts = wrapper.findAll('[data-testid="v-text"]')
      expect(texts).toHaveLength(2)
    })
  })

  describe('status colors (MCA-005)', () => {
    it('fills libre status with #22C55E', async () => {
      const wrapper = await mountNode({ estado: 'libre' })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#22C55E')
    })

    it('fills ocupada status with #EF4444', async () => {
      const wrapper = await mountNode({ estado: 'ocupada' })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#EF4444')
    })

    it('fills reservada status with #F59E0B', async () => {
      const wrapper = await mountNode({ estado: 'reservada' })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#F59E0B')
    })
  })

  describe('selected color', () => {
    it('uses terracotta #C67B5C when selected, regardless of estado', async () => {
      const wrapper = await mountNode({ estado: 'libre', selected: true })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#C67B5C')
    })

    it('selected overrides ocupada status color', async () => {
      const wrapper = await mountNode({ estado: 'ocupada', selected: true })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#C67B5C')
    })

    it('unselected mesa shows status color, not terracotta', async () => {
      const wrapper = await mountNode({ estado: 'reservada', selected: false })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-fill')).toBe('#F59E0B')
    })
  })

  describe('rect config', () => {
    it('has cornerRadius 8', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-cornerradius')).toBe('8')
    })

    it('has stroke #2D3748 with width 2', async () => {
      const wrapper = await mountNode()
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-stroke')).toBe('#2D3748')
      expect(rect.attributes('data-strokewidth')).toBe('2')
    })

    it('has shadowBlur 4', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-shadowblur')).toBe('4')
    })

    it('has perfectDrawEnabled false', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-perfectdraw')).toBe('false')
    })
  })

  describe('text content', () => {
    it('shows "Mesa {numero_mesa}" in first text', async () => {
      const mesa = makeMesa({ id: 'a', numero_mesa: 7 })
      const wrapper = await mountNode({ mesa })
      const texts = wrapper.findAll('[data-testid="v-text"]')
      expect(texts[0].attributes('data-text')).toBe('Mesa 7')
      // fontSize 14 for the numero
      expect(texts[0].attributes('data-fontsize')).toBe('14')
    })

    it('shows "{capacidad_actual} pax" in second text', async () => {
      const mesa = makeMesa({ id: 'a', capacidad_actual: 6 })
      const wrapper = await mountNode({ mesa })
      const texts = wrapper.findAll('[data-testid="v-text"]')
      expect(texts[1].attributes('data-text')).toBe('6 pax')
      // fontSize 11 for capacidad
      expect(texts[1].attributes('data-fontsize')).toBe('11')
    })
  })

  describe('fused tables (dashed border)', () => {
    it('has no strokeDash when id_fusion is null', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-strokedash')).toBe('')
    })

    it('has strokeDash [5,5] when id_fusion is set', async () => {
      const mesa = makeMesa({ id: 'fused', id_fusion: 'g1', mesa_padre_id: 'parent' })
      const wrapper = await mountNode({ mesa })
      expect(wrapper.find('[data-testid="v-rect"]').attributes('data-strokedash')).toBe('5,5')
    })
  })

  describe('emits', () => {
    it('emits click when v-group is clicked', async () => {
      const wrapper = await mountNode()
      await wrapper.find('[data-testid="v-group"]').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  // ══════════════════════════════════════════════════════════════════════
  // Shape rendering (AD-14)
  // ══════════════════════════════════════════════════════════════════════

  describe('shape rendering — forma (AD-14)', () => {
    it('renders v-rect for rectangular forma (default)', async () => {
      const wrapper = await mountNode()
      expect(wrapper.find('[data-testid="v-rect"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="v-circle"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="v-ellipse"]').exists()).toBe(false)
    })

    it('renders v-rect for cuadrada forma', async () => {
      const mesa = makeMesa({ id: 'sq', forma: 'cuadrada' })
      const wrapper = await mountNode({ mesa })
      expect(wrapper.find('[data-testid="v-rect"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="v-circle"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="v-ellipse"]').exists()).toBe(false)
    })

    it('renders v-circle for redonda forma with radius = ancho/2', async () => {
      const mesa = makeMesa({ id: 'round', forma: 'redonda', ancho: 120, alto: 120 })
      const wrapper = await mountNode({ mesa })
      const circle = wrapper.find('[data-testid="v-circle"]')
      expect(circle.exists()).toBe(true)
      expect(circle.attributes('data-radius')).toBe('60')
    })

    it('renders v-ellipse for ovalada forma with radiusX and radiusY', async () => {
      const mesa = makeMesa({ id: 'oval', forma: 'ovalada', ancho: 160, alto: 100 })
      const wrapper = await mountNode({ mesa })
      const ellipse = wrapper.find('[data-testid="v-ellipse"]')
      expect(ellipse.exists()).toBe(true)
      expect(ellipse.attributes('data-radiusx')).toBe('80')
      expect(ellipse.attributes('data-radiusy')).toBe('50')
    })

    it('applies strokeDash to all shapes when fused', async () => {
      const mesa = makeMesa({ id: 'fused-round', forma: 'redonda', id_fusion: 'g1', mesa_padre_id: 'parent' })
      const wrapper = await mountNode({ mesa })
      expect(wrapper.find('[data-testid="v-circle"]').attributes('data-strokedash')).toBe('5,5')
    })
  })
})
