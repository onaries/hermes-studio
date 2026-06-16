<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCheckbox, NSwitch, NSelect, NInputNumber, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/hermes/settings'
import { useTheme, type BrightnessMode } from '@/composables/useTheme'
import { requestCompletionNotificationPermission, showCompletionNotification, type CompletionNotificationPermissionResult } from '@/utils/completion-notification'
import {
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_FONT_SIZE,
  TERMINAL_FONT_FAMILY_OPTIONS,
  sanitizeTerminalFontFamily,
  sanitizeTerminalFontSize,
} from '@/utils/terminal-font-options'
import SettingRow from './SettingRow.vue'

const settingsStore = useSettingsStore()
const message = useMessage()
const { t } = useI18n()
const { brightness, setBrightness } = useTheme()

const themeOptions = [
  { label: t('settings.display.themeLight'), value: 'light' },
  { label: t('settings.display.themeDark'), value: 'dark' },
  { label: t('settings.display.themeSystem'), value: 'system' },
]

async function save(values: Record<string, any>) {
  try {
    await settingsStore.saveSection('display', values)
    message.success(t('settings.saved'))
  } catch (err: any) {
    message.error(t('settings.saveFailed'))
  }
}

function handleThemeChange(val: string) {
  const m = val as BrightnessMode
  setBrightness(m)
  save({ skin: m })
}

function handleTerminalFontFamilyChange(value: string | null) {
  save({ terminal_font_family: sanitizeTerminalFontFamily(value) })
}

function handleTerminalFontSizeChange(value: number | null) {
  if (value == null) return
  save({ terminal_font_size: sanitizeTerminalFontSize(value) })
}

function notificationPermissionErrorKey(result: CompletionNotificationPermissionResult): string {
  if (result.reason === 'insecure') return 'settings.display.notifyOnCompleteInsecure'
  if (result.reason === 'unsupported') return 'settings.display.notifyOnCompleteUnsupported'
  return 'settings.display.notifyOnCompleteDenied'
}

async function handleNotifyOnCompleteChange(value: boolean) {
  if (value) {
    const result = await requestCompletionNotificationPermission()
    if (!result.granted) {
      message.error(t(notificationPermissionErrorKey(result)))
      return
    }
  }
  await save({ notify_on_complete: value })
  if (value) {
    void showCompletionNotification({
      title: 'Hermes',
      body: t('settings.display.notifyOnCompleteTest'),
      icon: '/coding-agents/hermes.png',
      tag: `hermes-complete-test-${Date.now()}`,
    })
  }
}

const showToolMascotLegacy = computed(() => settingsStore.display.show_tool_mascot !== false)
const showToolMascotDesktop = computed(() => settingsStore.display.show_tool_mascot_desktop ?? showToolMascotLegacy.value)
const showToolMascotMobile = computed(() => settingsStore.display.show_tool_mascot_mobile ?? showToolMascotLegacy.value)

function saveToolMascotDesktop(value: boolean) {
  void save({ show_tool_mascot_desktop: value })
}

function saveToolMascotMobile(value: boolean) {
  void save({ show_tool_mascot_mobile: value })
}

async function testCompletionNotification() {
  const result = await requestCompletionNotificationPermission()
  if (!result.granted) {
    message.error(t(notificationPermissionErrorKey(result)))
    return
  }
  const shown = await showCompletionNotification({
    title: 'Hermes',
    body: t('settings.display.notifyOnCompleteTest'),
    icon: '/coding-agents/hermes.png',
    tag: `hermes-complete-test-${Date.now()}`,
  })
  if (!shown) {
    message.error(t('settings.display.notifyOnCompleteTestFailed'))
    return
  }
  message.success(t('settings.display.notifyOnCompleteTestSent'))
}
</script>

<template>
  <section class="settings-section">
    <SettingRow :label="t('settings.display.theme')" :hint="t('settings.display.themeHint')">
      <NSelect :value="brightness" :options="themeOptions" size="small" :consistent-menu-width="false" class="input-sm" @update:value="handleThemeChange" />
    </SettingRow>
    <SettingRow :label="t('settings.display.streaming')" :hint="t('settings.display.streamingHint')">
      <NSwitch :value="settingsStore.display.streaming" @update:value="v => save({ streaming: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.compact')" :hint="t('settings.display.compactHint')">
      <NSwitch :value="settingsStore.display.compact" @update:value="v => save({ compact: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.showReasoning')" :hint="t('settings.display.showReasoningHint')">
      <NSwitch :value="settingsStore.display.show_reasoning" @update:value="v => save({ show_reasoning: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.showCost')" :hint="t('settings.display.showCostHint')">
      <NSwitch :value="settingsStore.display.show_cost" @update:value="v => save({ show_cost: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.showLiveTps')" :hint="t('settings.display.showLiveTpsHint')">
      <NSwitch :value="settingsStore.display.show_live_tps !== false" @update:value="v => save({ show_live_tps: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.showToolMascot')" :hint="t('settings.display.showToolMascotHint')">
      <div class="mascot-checkboxes">
        <NCheckbox :checked="showToolMascotDesktop" @update:checked="saveToolMascotDesktop">
          {{ t('settings.display.showToolMascotDesktop') }}
        </NCheckbox>
        <NCheckbox :checked="showToolMascotMobile" @update:checked="saveToolMascotMobile">
          {{ t('settings.display.showToolMascotMobile') }}
        </NCheckbox>
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.display.showDrawerRainbow')" :hint="t('settings.display.showDrawerRainbowHint')">
      <NSwitch :value="settingsStore.display.show_drawer_rainbow !== false" @update:value="v => save({ show_drawer_rainbow: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.inlineDiffs')" :hint="t('settings.display.inlineDiffsHint')">
      <NSwitch :value="settingsStore.display.inline_diffs" @update:value="v => save({ inline_diffs: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.bellOnComplete')" :hint="t('settings.display.bellOnCompleteHint')">
      <NSwitch :value="settingsStore.display.bell_on_complete" @update:value="v => save({ bell_on_complete: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.notifyOnComplete')" :hint="`${t('settings.display.notifyOnCompleteHint')} ${t('settings.display.notifyOnCompleteMacHint')}`">
      <div class="notify-controls">
        <NSwitch :value="settingsStore.display.notify_on_complete" @update:value="handleNotifyOnCompleteChange" />
        <NButton size="tiny" secondary @click="testCompletionNotification">
          {{ t('settings.display.notifyOnCompleteTestButton') }}
        </NButton>
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.display.mobileEnterToSend')" :hint="t('settings.display.mobileEnterToSendHint')">
      <NSwitch :value="settingsStore.display.mobile_enter_to_send === true" @update:value="v => save({ mobile_enter_to_send: v })" />
    </SettingRow>
    <SettingRow :label="t('settings.display.terminalFontSize')" :hint="t('settings.display.terminalFontSizeHint')">
      <NInputNumber
        :value="settingsStore.display.terminal_font_size ?? DEFAULT_TERMINAL_FONT_SIZE"
        :min="9"
        :max="32"
        :step="1"
        size="small"
        class="input-sm"
        @update:value="handleTerminalFontSizeChange"
      />
    </SettingRow>
    <SettingRow :label="t('settings.display.terminalFontFamily')" :hint="t('settings.display.terminalFontFamilyHint')">
      <NSelect
        :value="sanitizeTerminalFontFamily(settingsStore.display.terminal_font_family)"
        :options="TERMINAL_FONT_FAMILY_OPTIONS"
        size="small"
        class="input-md"
        :placeholder="DEFAULT_TERMINAL_FONT_FAMILY"
        :consistent-menu-width="false"
        filterable
        tag
        clearable
        @update:value="handleTerminalFontFamilyChange"
      />
    </SettingRow>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.settings-section {
  margin-top: 16px;
}

.notify-controls,
.mascot-checkboxes {
  display: inline-flex;
  align-items: center;
}

.notify-controls {
  gap: 10px;
}

.mascot-checkboxes {
  flex-wrap: wrap;
  gap: 12px 18px;
}

.input-md {
  width: min(360px, 100%);
}
</style>
