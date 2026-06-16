// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockSettingsStore = vi.hoisted(() => ({
  display: {
    streaming: true,
    compact: false,
    show_reasoning: true,
    show_cost: false,
    show_live_tps: undefined,
    show_tool_mascot: undefined,
    show_tool_mascot_desktop: undefined,
    show_tool_mascot_mobile: undefined,
    show_drawer_rainbow: undefined,
    inline_diffs: true,
    bell_on_complete: false,
    notify_on_complete: false,
    mobile_enter_to_send: false,
    terminal_font_size: 14,
    terminal_font_family: 'Menlo, Monaco, "Courier New", monospace',
    busy_input_mode: 'interrupt',
  },
  saveSection: vi.fn(),
}))

vi.mock('@/stores/hermes/settings', () => ({
  useSettingsStore: () => mockSettingsStore,
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    brightness: 'system',
    setBrightness: vi.fn(),
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('naive-ui', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
    }),
    NButton: defineComponent({
      name: 'NButton',
      emits: ['click'],
      setup: (_, { emit, slots, attrs }) => () => h('button', {
        ...attrs,
        type: 'button',
        onClick: () => emit('click'),
      }, slots.default?.()),
    }),
    NSwitch: defineComponent({
      name: 'NSwitch',
      props: ['value'],
      emits: ['update:value'],
      setup: (props, { emit }) => () => h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': String(!!props.value),
        onClick: () => emit('update:value', !props.value),
      }),
    }),
    NSelect: defineComponent({
      name: 'NSelect',
      props: ['value', 'options'],
      emits: ['update:value'],
      setup: (props, { emit, attrs }) => () => h('select', {
        ...attrs,
        value: props.value,
        onChange: (event: Event) => emit('update:value', (event.target as HTMLSelectElement).value),
      }, (props.options ?? []).map((option: { label: string; value: string }) => h('option', {
        value: option.value,
      }, option.label))),
    }),
    NInputNumber: defineComponent({
      name: 'NInputNumber',
      props: ['value'],
      emits: ['update:value'],
      setup: (props, { emit, attrs }) => () => h('input', {
        ...attrs,
        type: 'number',
        value: props.value,
        onInput: (event: Event) => emit('update:value', Number((event.target as HTMLInputElement).value)),
      }),
    }),
  }
})

import DisplaySettings from '@/components/hermes/settings/DisplaySettings.vue'

describe('DisplaySettings', () => {
  beforeEach(() => {
    mockSettingsStore.saveSection.mockReset()
    mockSettingsStore.display.show_live_tps = undefined
    mockSettingsStore.display.show_tool_mascot = undefined
    mockSettingsStore.display.show_tool_mascot_desktop = undefined
    mockSettingsStore.display.show_tool_mascot_mobile = undefined
    mockSettingsStore.display.show_drawer_rainbow = undefined
    mockSettingsStore.display.terminal_font_size = 14
    mockSettingsStore.display.terminal_font_family = 'Menlo, Monaco, "Courier New", monospace'
  })

  function mountDisplaySettings() {
    return mount(DisplaySettings, {
      global: {
        stubs: {
          SettingRow: {
            props: ['label', 'hint'],
            template: '<div class="setting-row"><div class="setting-row-label">{{ label }}</div><div class="setting-row-hint">{{ hint }}</div><slot /></div>',
          },
          NSelect: {
            props: ['value', 'options'],
            emits: ['update:value'],
            template: '<select class="select-stub" :value="value" @change="$emit(\'update:value\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
          },
          'n-select': {
            props: ['value', 'options'],
            emits: ['update:value'],
            template: '<select class="select-stub" :value="value" @change="$emit(\'update:value\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
          },
          NInputNumber: {
            props: ['value'],
            emits: ['update:value'],
            template: '<input class="number-stub" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
          },
          'n-input-number': {
            props: ['value'],
            emits: ['update:value'],
            template: '<input class="number-stub" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
          },
          NInput: {
            props: ['value'],
            emits: ['update:value'],
            template: '<input class="input-stub" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
          },
          'n-input': {
            props: ['value'],
            emits: ['update:value'],
            template: '<input class="input-stub" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
          },
          NSwitch: {
            props: ['value'],
            emits: ['update:value'],
            template: '<button type="button" role="switch" class="switch-stub" :aria-checked="String(!!value)" :data-value="String(value)" @click="$emit(\'update:value\', !value)"></button>',
          },
          'n-switch': {
            props: ['value'],
            emits: ['update:value'],
            template: '<button type="button" role="switch" class="switch-stub" :aria-checked="String(!!value)" :data-value="String(value)" @click="$emit(\'update:value\', !value)"></button>',
          },
        },
      },
    })
  }

  it('does not expose the unwired busy input mode toggle', () => {
    const wrapper = mountDisplaySettings()

    expect(wrapper.text()).not.toContain('settings.display.busyInputMode')
    expect(wrapper.text()).not.toContain('settings.display.busyInputModeHint')
  })

  it('exposes a live TPS display toggle that defaults on and saves changes', async () => {
    mockSettingsStore.saveSection.mockResolvedValue(undefined)
    const wrapper = mountDisplaySettings()

    const rows = wrapper.findAll('.setting-row')
    const liveTpsRow = rows.find(row => row.text().includes('settings.display.showLiveTps'))
    expect(liveTpsRow?.text()).toContain('settings.display.showLiveTpsHint')
    const toggle = liveTpsRow?.find('[role="switch"]')
    expect(toggle?.attributes('aria-checked')).toBe('true')

    await toggle?.trigger('click')

    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { show_live_tps: false })
  })

  it('exposes separate desktop and mobile tool mascot toggles with legacy default fallback', async () => {
    mockSettingsStore.saveSection.mockResolvedValue(undefined)
    const wrapper = mountDisplaySettings()

    const rows = wrapper.findAll('.setting-row')
    const desktopRow = rows.find(row => row.text().includes('settings.display.showToolMascotDesktop'))
    expect(desktopRow?.text()).toContain('settings.display.showToolMascotDesktopHint')
    const mobileRow = rows.find(row => row.text().includes('settings.display.showToolMascotMobile'))
    expect(mobileRow?.text()).toContain('settings.display.showToolMascotMobileHint')

    const desktopToggle = desktopRow?.find('[role="switch"]')
    const mobileToggle = mobileRow?.find('[role="switch"]')
    expect(desktopToggle?.attributes('aria-checked')).toBe('true')
    expect(mobileToggle?.attributes('aria-checked')).toBe('true')

    await desktopToggle?.trigger('click')
    await mobileToggle?.trigger('click')

    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { show_tool_mascot_desktop: false })
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { show_tool_mascot_mobile: false })
  })

  it('exposes a drawer rainbow glow toggle that defaults on and saves changes', async () => {
    mockSettingsStore.saveSection.mockResolvedValue(undefined)
    const wrapper = mountDisplaySettings()

    const rows = wrapper.findAll('.setting-row')
    const rainbowRow = rows.find(row => row.text().includes('settings.display.showDrawerRainbow'))
    expect(rainbowRow?.text()).toContain('settings.display.showDrawerRainbowHint')
    const toggle = rainbowRow?.find('[role="switch"]')
    expect(toggle?.attributes('aria-checked')).toBe('true')

    await toggle?.trigger('click')

    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { show_drawer_rainbow: false })
  })

  it('exposes terminal font controls and saves changes', async () => {
    mockSettingsStore.saveSection.mockResolvedValue(undefined)
    const wrapper = mountDisplaySettings()

    const rows = wrapper.findAll('.setting-row')
    const fontSizeRow = rows.find(row => row.text().includes('settings.display.terminalFontSize'))
    expect(fontSizeRow?.text()).toContain('settings.display.terminalFontSizeHint')
    const numberInput = fontSizeRow?.find('input')
    expect(numberInput?.exists()).toBe(true)
    await numberInput?.setValue('18')

    const fontFamilyRow = rows.find(row => row.text().includes('settings.display.terminalFontFamily'))
    expect(fontFamilyRow?.text()).toContain('settings.display.terminalFontFamilyHint')
    const fontSelect = fontFamilyRow?.find('select')
    expect(fontSelect?.exists()).toBe(true)
    expect(fontFamilyRow?.findAll('option').map(option => option.attributes('value'))).toContain('"JetBrains Mono", monospace')
    await fontSelect?.setValue('"Fira Code", monospace')

    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_size: 18 })
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_family: '"Fira Code", monospace' })
  })
})
