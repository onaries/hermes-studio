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
  const actual = await vi.importActual<any>('naive-ui')
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
    }),
  }
})

import DisplaySettings from '@/components/hermes/settings/DisplaySettings.vue'

describe('DisplaySettings', () => {
  beforeEach(() => {
    mockSettingsStore.saveSection.mockReset()
    mockSettingsStore.display.show_live_tps = undefined
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
          NSelect: true,
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
            template: '<button type="button" class="switch-stub" :data-value="String(value)" @click="$emit(\'update:value\', !value)"></button>',
          },
          'n-switch': {
            props: ['value'],
            emits: ['update:value'],
            template: '<button type="button" class="switch-stub" :data-value="String(value)" @click="$emit(\'update:value\', !value)"></button>',
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
    const textInput = fontFamilyRow?.find('input')
    expect(textInput?.exists()).toBe(true)
    await textInput?.setValue('JetBrains Mono, monospace')

    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_size: 18 })
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_family: 'JetBrains Mono, monospace' })
  })
})
