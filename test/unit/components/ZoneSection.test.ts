/**
 * TDD: RED → GREEN → TRIANGULATE — ZoneSection component (MCA-002)
 *
 * Zone background rectangles with labels for the 5-zone layout.
 * Uses vue-konva v-rect + v-text (mocked at module level).
 *
 * Zone colors:
 *   Principal=#E8D5C4, Zingaro=#D4C5B9, Privado=#C9BFB0,
 *   Terraza=#B8C9B0, Bar=#C4B8D0
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'

// ── Mock vue-konva at module level ──
// Konva.js requires a canvas 2D context which happy-dom doesn't provide.
// We replace vue-konva components with simple renderers that expose their
// config as data attributes for assertion.

vi.mock('vue-konva', () => ({
  Rect: defineComponent({
    props: ['config'],
    setup(props) {
      return () => h('div', {
        'data-testid': 'v-rect',
        'data-x': String(props.config?.x ?? ''),
        'data-y': String(props.config?.y ?? ''),
        'data-width': String(props.config?.width ?? ''),
        'data-height': String(props.config?.height ?? ''),
        'data-fill': String(props.config?.fill ?? ''),
        'data-opacity': String(props.config?.opacity ?? ''),
        'data-stroke': String(props.config?.stroke ?? ''),
        'data-strokewidth': String(props.config?.strokeWidth ?? ''),
        'data-cornerradius': String(props.config?.cornerRadius ?? ''),
        'data-perfectdraw': String(props.config?.perfectDrawEnabled ?? ''),
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
        'data-align': String(props.config?.align ?? ''),
        'data-x': String(props.config?.x ?? ''),
        'data-y': String(props.config?.y ?? ''),
      })
    },
  }),
  Group: defineComponent({
    props: ['config'],
    setup(props, { slots }) {
      return () => h('div', {
        'data-testid': 'v-group',
        'data-x': String(props.config?.x ?? ''),
        'data-y': String(props.config?.y ?? ''),
        'data-rotation': String(props.config?.rotation ?? ''),
        'data-draggable': String(props.config?.draggable ?? ''),
      }, slots.default?.())
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

// ============================================================================
// ZoneSection Tests
// ============================================================================

describe('ZoneSection — renders rect + text for each zone', () => {
  async function mountZone(zona: string, overrides?: Record<string, number>) {
    const mod = await import('../../../app/features/mesas/components/ZoneSection.vue')
    return mount(mod.default, {
      props: {
        zona,
        x: overrides?.x ?? 0,
        y: overrides?.y ?? 0,
        width: overrides?.width ?? 300,
        height: overrides?.height ?? 400,
      },
    })
  }

  describe('zone colors (MCA-002)', () => {
    it('Principal renders with #E8D5C4 fill', async () => {
      const wrapper = await mountZone('Principal')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-fill')).toBe('#E8D5C4')
    })

    it('Zingaro renders with #D4C5B9 fill', async () => {
      const wrapper = await mountZone('Zingaro')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-fill')).toBe('#D4C5B9')
    })

    it('Privado renders with #C9BFB0 fill', async () => {
      const wrapper = await mountZone('Privado')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-fill')).toBe('#C9BFB0')
    })

    it('Terraza renders with #B8C9B0 fill', async () => {
      const wrapper = await mountZone('Terraza')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-fill')).toBe('#B8C9B0')
    })

    it('Bar renders with #C4B8D0 fill', async () => {
      const wrapper = await mountZone('Bar')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-fill')).toBe('#C4B8D0')
    })
  })

  describe('rect config passes props', () => {
    it('uses x, y, width, height from props', async () => {
      const wrapper = await mountZone('Principal')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-x')).toBe('0')
      expect(rect.attributes('data-y')).toBe('0')
      expect(rect.attributes('data-width')).toBe('300')
      expect(rect.attributes('data-height')).toBe('400')
    })

    it('has semi-transparent opacity for zone backgrounds', async () => {
      const wrapper = await mountZone('Principal')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-opacity')).toBe('0.3')
    })

    it('has transparent stroke on zone rect', async () => {
      const wrapper = await mountZone('Principal')
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-stroke')).toBe('transparent')
    })
  })

  describe('zone label text', () => {
    it('renders the zona name as label text', async () => {
      const wrapper = await mountZone('Zingaro')
      const label = wrapper.find('[data-testid="v-text"]')
      expect(label.attributes('data-text')).toBe('Zingaro')
    })

    it('label has correct fontSize 20', async () => {
      const wrapper = await mountZone('Principal')
      const label = wrapper.find('[data-testid="v-text"]')
      expect(label.attributes('data-fontsize')).toBe('20')
    })

    it('each zone renders its own label text', async () => {
      const terrazaWrapper = await mountZone('Terraza')
      const barWrapper = await mountZone('Bar')
      expect(terrazaWrapper.find('[data-testid="v-text"]').attributes('data-text')).toBe('Terraza')
      expect(barWrapper.find('[data-testid="v-text"]').attributes('data-text')).toBe('Bar')
    })
  })

  describe('zone-specific dimensions', () => {
    it('renders different dimensions when props change', async () => {
      const wrapper = await mountZone('Principal', { x: 100, y: 200, width: 500, height: 600 })
      const rect = wrapper.find('[data-testid="v-rect"]')
      expect(rect.attributes('data-x')).toBe('100')
      expect(rect.attributes('data-y')).toBe('200')
      expect(rect.attributes('data-width')).toBe('500')
      expect(rect.attributes('data-height')).toBe('600')
    })
  })
})
