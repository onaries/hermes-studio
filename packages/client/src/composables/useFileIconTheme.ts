import { ref, watch } from 'vue'

export type FileIconTheme = 'color' | 'mono' | 'terminal'

const STORAGE_KEY = 'hermes_file_icon_theme'
const THEMES = ['color', 'mono', 'terminal'] as const

export const fileIconThemeOptions: Array<{ label: string; value: FileIconTheme }> = [
  { label: 'Color', value: 'color' },
  { label: 'Mono', value: 'mono' },
  { label: 'Terminal', value: 'terminal' },
]

function isFileIconTheme(value: unknown): value is FileIconTheme {
  return typeof value === 'string' && THEMES.includes(value as FileIconTheme)
}

const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
const iconTheme = ref<FileIconTheme>(isFileIconTheme(saved) ? saved : 'color')

watch(iconTheme, (theme) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme)
})

export function useFileIconTheme() {
  return { iconTheme, fileIconThemeOptions }
}
