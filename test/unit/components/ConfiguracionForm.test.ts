/**
 * TDD: RED → GREEN → TRIANGULATE — ConfiguracionForm (CFG-001)
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const g = globalThis as Record<string, unknown>
g.useSupabaseClient = () => ({ from: vi.fn(), auth: vi.fn() })
g.useImageUpload = () => ({
  uploading: ref(false),
  uploadError: ref(null),
  uploadFromFile: vi.fn().mockResolvedValue(null),
  uploadFromUrl: vi.fn().mockResolvedValue(null),
  validateImage: vi.fn().mockReturnValue(null),
  compressToWebP: vi.fn(),
})
g.toProxyUrl = (url: string | null | undefined) => url || undefined

describe('ConfiguracionForm (CFG-001)', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const mod = await import('../../../app/components/ConfiguracionForm.vue')
    return mount(mod.default, {
      props: {
        currentConfig: { capacidad_total_local: 80 },
        ...props,
      },
    })
  }

  it('renders section headings (new 8-section layout)', async () => {
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('General')
    expect(wrapper.text()).toContain('Reservas')
  })

  it('displays capacidad_total_local input with current value', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 120 } })
    const input = wrapper.find('input[data-testid="cfg-capacidad"]')
    expect((input.element as HTMLInputElement).value).toBe('120')
  })

  it('validates capacidad min 1', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 0 } })
    // Set invalid value
    const input = wrapper.find('input[data-testid="cfg-capacidad"]')
    await input.setValue(0)
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('La capacidad debe ser al menos 1')
  })

  // ── CFG-004: modo_ocupacion radio buttons ──

  it('renders modo_ocupacion radio buttons with Automático and Manual labels', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    expect(wrapper.text()).toContain('Automático')
    expect(wrapper.text()).toContain('Manual')
    const radioAuto = wrapper.find('input[value="auto"]')
    const radioManual = wrapper.find('input[value="manual"]')
    expect(radioAuto.exists()).toBe(true)
    expect(radioManual.exists()).toBe(true)
  })

  it('checks the auto radio when modo_ocupacion is "auto"', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    const radioAuto = wrapper.find('input[value="auto"]')
    expect((radioAuto.element as HTMLInputElement).checked).toBe(true)
  })

  it('checks the manual radio when modo_ocupacion is "manual"', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'manual', ocupacion_manual: 0 } })
    const radioManual = wrapper.find('input[value="manual"]')
    expect((radioManual.element as HTMLInputElement).checked).toBe(true)
  })

  // ── CFG-005: ocupacion_manual number input ──

  it('shows ocupacion_manual number input when modo is "manual"', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'manual', ocupacion_manual: 15 } })
    const manualInput = wrapper.find('input[data-testid="cfg-ocupacion-manual"]')
    expect(manualInput.exists()).toBe(true)
    expect((manualInput.element as HTMLInputElement).value).toBe('15')
  })

  it('hides ocupacion_manual input when modo is "auto"', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'auto', ocupacion_manual: 0 } })
    const manualInput = wrapper.find('input[data-testid="cfg-ocupacion-manual"]')
    expect(manualInput.exists()).toBe(false)
  })

  it('renders "Número de ocupantes" label on ocupacion_manual input (CFG-005 spec)', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 80, modo_ocupacion: 'manual', ocupacion_manual: 15 } })
    expect(wrapper.text()).toContain('Número de ocupantes')
  })

  it('sets max attribute on ocupacion_manual to the zonas-derived capacity (CFG-005)', async () => {
    const wrapper = await mountForm({
      currentConfig: {
        capacidad_total_local: 80,
        modo_ocupacion: 'manual',
        ocupacion_manual: 0,
        zonas_config: [
          { id: 'a', nombre: 'A', capacidad: 70, enabled: true },
          { id: 'b', nombre: 'B', capacidad: 10, enabled: true },
        ],
      },
    })
    const manualInput = wrapper.find('input[data-testid="cfg-ocupacion-manual"]')
    expect(manualInput.exists()).toBe(true)
    // 70 + 10 = 80
    expect((manualInput.element as HTMLInputElement).max).toBe('80')
  })

  it('emits submit with modo_ocupacion and ocupacion_manual fields', async () => {
    const wrapper = await mountForm({ currentConfig: { capacidad_total_local: 100, modo_ocupacion: 'manual', ocupacion_manual: 25 } })
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeTruthy()
    const emittedData = wrapper.emitted('submit')![0][0]
    expect(emittedData.modo_ocupacion).toBe('manual')
    expect(emittedData.ocupacion_manual).toBe(25)
    // New fields should have sensible defaults
    expect(emittedData.modo_reserva).toBe('automatica')
  })

  it('rejects save when ocupacion_manual exceeds zonas-derived capacity (CFG-005)', async () => {
    const wrapper = await mountForm({
      currentConfig: {
        capacidad_total_local: 80,
        modo_ocupacion: 'manual',
        ocupacion_manual: 0,
        zonas_config: [
          { id: 'a', nombre: 'A', capacidad: 70, enabled: true },
          { id: 'b', nombre: 'B', capacidad: 10, enabled: true },
        ],
      },
    })
    // capacidad total (enabled) = 80. Enter 100 → must fail validation.
    await wrapper.find('input[data-testid="cfg-ocupacion-manual"]').setValue(100)
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('La ocupación manual no puede superar la capacidad total del local')
  })

  // ── CFG-004: "Aforo del local" informational section ──

  it('renders "Aforo del local" section heading (CFG-004)', async () => {
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('Aforo del local')
  })

  it('renders the description explaining the connection to the table manager (CFG-004)', async () => {
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('Este valor se usa como límite máximo de ocupación en el gestor de mesas')
  })

  it('shows the zonas-derived total in the Aforo del local section (CFG-004, deprecated capacidad_total_local)', async () => {
    const wrapper = await mountForm({
      currentConfig: {
        capacidad_total_local: 999, // deprecated column — must NOT be shown
        zonas_config: [
          { id: 'a', nombre: 'A', capacidad: 50, enabled: true },
          { id: 'b', nombre: 'B', capacidad: 30, enabled: true },
        ],
      },
    })
    const aforoValue = wrapper.find('[data-testid="cfg-aforo-total"]')
    expect(aforoValue.exists()).toBe(true)
    // 50 + 30 = 80 (sum of ENABLED zones; deprecated capacidad_total_local=999 ignored)
    expect(aforoValue.text()).toBe('80')
  })

  it('ignores disabled zones when computing the Aforo del local total', async () => {
    const wrapper = await mountForm({
      currentConfig: {
        capacidad_total_local: 999,
        zonas_config: [
          { id: 'a', nombre: 'A', capacidad: 50, enabled: true },
          { id: 'b', nombre: 'B', capacidad: 40, enabled: false },
          { id: 'c', nombre: 'C', capacidad: 30, enabled: true },
        ],
      },
    })
    const aforoValue = wrapper.find('[data-testid="cfg-aforo-total"]')
    // 50 + 30 = 80 (disabled 40 zone ignored)
    expect(aforoValue.text()).toBe('80')
  })

  // ── New sections (configuracion-horarios-zonas) ──

  describe('Horarios section (HOR-001)', () => {
    it('renders "Horarios" section heading', async () => {
      const wrapper = await mountForm()
      expect(wrapper.text()).toContain('Horarios')
    })

    it('renders 4 time inputs for comida and cena', async () => {
      const wrapper = await mountForm()
      expect(wrapper.find('input[data-testid="cfg-comida-inicio"]').exists()).toBe(true)
      expect(wrapper.find('input[data-testid="cfg-comida-fin"]').exists()).toBe(true)
      expect(wrapper.find('input[data-testid="cfg-cena-inicio"]').exists()).toBe(true)
      expect(wrapper.find('input[data-testid="cfg-cena-fin"]').exists()).toBe(true)
    })

    it('renders intervalo select with 3 options', async () => {
      const wrapper = await mountForm()
      const select = wrapper.find('select[data-testid="cfg-intervalo"]')
      expect(select.exists()).toBe(true)
      const options = select.findAll('option')
      expect(options.length).toBeGreaterThanOrEqual(3)
      expect(options.some((o) => o.text().includes('15 minutos'))).toBe(true)
      expect(options.some((o) => o.text().includes('20 minutos'))).toBe(true)
      expect(options.some((o) => o.text().includes('30 minutos'))).toBe(true)
    })

    it('renders slot preview when horarios_config is valid', async () => {
      const wrapper = await mountForm()
      // Default has valid horarios_config
      const previewSpans = wrapper.findAll('[data-testid="slot-preview"]')
      expect(previewSpans.length).toBeGreaterThan(0)
    })

    it('emits submit with horarios_config values', async () => {
      const wrapper = await mountForm()
      await wrapper.find('form').trigger('submit.prevent')
      const emitted = wrapper.emitted('submit')![0][0]
      expect(emitted.horarios_config).toBeDefined()
      expect(emitted.horarios_config.comida_inicio).toBe('13:30')
      expect(emitted.horarios_config.intervalo_minutos).toBe(15)
    })
  })

  describe('Zonas section (ZON-001, ZON-002)', () => {
    it('renders "Zonas del restaurante" section heading', async () => {
      const wrapper = await mountForm()
      expect(wrapper.text()).toContain('Zonas del restaurante')
    })

    it('renders total capacity', async () => {
      const wrapper = await mountForm()
      expect(wrapper.find('[data-testid="zona-capacidad-total"]').exists()).toBe(true)
      // Default 5 zones sum: 70+14+60+100+20 = 264
      expect(wrapper.find('[data-testid="zona-capacidad-total"]').text()).toBe('264')
    })

    it('renders 5 default zone rows', async () => {
      const wrapper = await mountForm()
      const nombreInputs = wrapper.findAll('[data-testid="zona-nombre"]')
      expect(nombreInputs.length).toBe(5)
    })

    it('each zone row has nombre, capacidad, enabled, and delete', async () => {
      const wrapper = await mountForm()
      expect(wrapper.findAll('[data-testid="zona-capacidad"]').length).toBe(5)
      expect(wrapper.findAll('[data-testid="zona-enabled"]').length).toBe(5)
      expect(wrapper.findAll('[data-testid="zona-delete"]').length).toBe(5)
    })

    it('"Añadir zona" button adds a new zone row', async () => {
      const wrapper = await mountForm()
      const addBtn = wrapper.find('[data-testid="zona-add"]')
      expect(addBtn.exists()).toBe(true)

      await addBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('[data-testid="zona-nombre"]').length).toBe(6)
    })

    it('delete button is disabled when only 1 zone', async () => {
      // Mount with minimal config that has only 1 zone
      const wrapper = await mountForm({
        currentConfig: {
          capacidad_total_local: 80,
          zonas_config: [{ id: 'test', nombre: 'Test', capacidad: 10, enabled: true }],
        },
      })
      const deleteBtn = wrapper.find('[data-testid="zona-delete"]')
      expect((deleteBtn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('emits submit with zonas_config values', async () => {
      const wrapper = await mountForm()
      await wrapper.find('form').trigger('submit.prevent')
      const emitted = wrapper.emitted('submit')![0][0]
      expect(emitted.zonas_config).toBeDefined()
      expect(Array.isArray(emitted.zonas_config)).toBe(true)
      expect(emitted.zonas_config.length).toBe(5)
      expect(emitted.zonas_config[0].id).toBe('principal')
    })
  })

  describe('Días bloqueados section (CFG-012, BLO-001)', () => {
    it('renders "Días bloqueados" section heading', async () => {
      const wrapper = await mountForm()
      expect(wrapper.text()).toContain('Días bloqueados')
    })

    it('renders add form with date, recurrente, motivo, and add button', async () => {
      const wrapper = await mountForm()
      expect(wrapper.find('[data-testid="dia-fecha"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dia-recurrente"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dia-motivo"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="dia-add"]').exists()).toBe(true)
    })

    it('shows "no hay días bloqueados" when empty', async () => {
      const wrapper = await mountForm()
      expect(wrapper.text()).toContain('No hay días bloqueados')
    })

    it('renders existing blocked days from prop', async () => {
      const dias = [
        { id: '1', fecha: '2026-12-25', recurrente: true, motivo: 'Navidad', fecha_fin: null },
        { id: '2', fecha: '2026-01-01', recurrente: false, motivo: null, fecha_fin: null },
      ]
      const wrapper = await mountForm({
        currentConfig: { capacidad_total_local: 80 },
        existingDiasBloqueados: dias,
      })
      expect(wrapper.text()).toContain('2026-12-25')
      expect(wrapper.text()).toContain('Navidad')
      expect(wrapper.text()).toContain('Cada año')
      expect(wrapper.find('[data-testid="dia-delete"]').exists()).toBe(true)
    })

    it('emits addDiaBloqueado with form data', async () => {
      const wrapper = await mountForm()

      await wrapper.find('[data-testid="dia-fecha"]').setValue('2026-12-25')
      await wrapper.find('[data-testid="dia-motivo"]').setValue('Navidad')
      await wrapper.find('[data-testid="dia-add"]').trigger('click')

      expect(wrapper.emitted('addDiaBloqueado')).toBeTruthy()
      expect(wrapper.emitted('addDiaBloqueado')![0][0]).toEqual({
        fecha: '2026-12-25',
        recurrente: false,
        fecha_fin: null,
        motivo: 'Navidad',
      })
    })

    it('emits addDiaBloqueado with recurrente flag', async () => {
      const wrapper = await mountForm()

      await wrapper.find('[data-testid="dia-fecha"]').setValue('2026-12-25')
      await wrapper.find('[data-testid="dia-recurrente"]').setValue(true)
      await wrapper.find('[data-testid="dia-add"]').trigger('click')

      expect(wrapper.emitted('addDiaBloqueado')![0][0].recurrente).toBe(true)
    })

    it('emits deleteDiaBloqueado when delete button clicked', async () => {
      const dias = [{ id: 'abc-123', fecha: '2026-12-25', recurrente: false, motivo: null, fecha_fin: null }]
      const wrapper = await mountForm({
        currentConfig: { capacidad_total_local: 80 },
        existingDiasBloqueados: dias,
      })

      await wrapper.find('[data-testid="dia-delete"]').trigger('click')
      expect(wrapper.emitted('deleteDiaBloqueado')).toBeTruthy()
      expect(wrapper.emitted('deleteDiaBloqueado')![0][0]).toBe('abc-123')
    })

    it('extends section heading test to include 11 sections', async () => {
      const wrapper = await mountForm()
      expect(wrapper.text()).toContain('General')
      expect(wrapper.text()).toContain('Horarios')
      expect(wrapper.text()).toContain('Zonas del restaurante')
      expect(wrapper.text()).toContain('Días bloqueados')
    })
  })
})
