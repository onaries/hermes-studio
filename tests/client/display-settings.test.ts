// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockSettingsStore = vi.hoisted(() => ({
  display: {
    streaming: true,
    compact: false,
    show_reasoning: true,
    show_cost: false,
    inline_diffs: true,
    bell_on_complete: false,
    browser_notify_on_complete: false,
    mobile_enter_to_send: false,
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
    vi.clearAllMocks()
    mockSettingsStore.display.browser_notify_on_complete = false
    mockSettingsStore.saveSection.mockResolvedValue(undefined)
    Reflect.deleteProperty(window, 'Notification')
  })

  it('does not expose the unwired busy input mode toggle', () => {
    const wrapper = mount(DisplaySettings, {
      global: {
        stubs: {
          SettingRow: {
            props: ['label', 'hint'],
            template: '<div class="setting-row"><div class="setting-row-label">{{ label }}</div><div class="setting-row-hint">{{ hint }}</div><slot /></div>',
          },
          NSelect: true,
          NSwitch: true,
        },
      },
    })

    expect(wrapper.text()).not.toContain('settings.display.busyInputMode')
    expect(wrapper.text()).not.toContain('settings.display.busyInputModeHint')
  })

  it('posts a probe notification when completion desktop notifications are enabled', async () => {
    const notification = vi.fn(() => ({ close: vi.fn() }))
    Object.assign(notification, {
      permission: 'granted',
      requestPermission: vi.fn(),
    })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: notification,
    })

    const wrapper = mount(DisplaySettings, {
      global: {
        stubs: {
          SettingRow: {
            props: ['label', 'hint'],
            template: '<div class="setting-row"><div class="setting-row-label">{{ label }}</div><div class="setting-row-hint">{{ hint }}</div><slot /></div>',
          },
          NSelect: true,
          NSwitch: {
            name: 'NSwitch',
            props: ['value'],
            emits: ['update:value'],
            template: '<button class="switch" @click="$emit(\'update:value\', true)"></button>',
          },
        },
      },
    })

    const switches = wrapper.findAll('.n-switch')
    expect(switches.length).toBeGreaterThanOrEqual(7)
    await switches[6].trigger('click')

    expect(notification).toHaveBeenCalledWith('chat.browserNotificationsEnabled', expect.objectContaining({
      body: 'settings.display.browserNotifyOnCompleteHint',
      tag: 'hermes-notification-enable-probe',
      silent: true,
    }))
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { browser_notify_on_complete: true })
  })
})
