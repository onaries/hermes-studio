export const DEFAULT_TERMINAL_FONT_SIZE = 14
export const DEFAULT_TERMINAL_FONT_FAMILY = 'Menlo, Monaco, "Courier New", monospace'

export const TERMINAL_FONT_FAMILY_OPTIONS = [
  {
    label: 'Default — Menlo / Monaco / Courier New',
    value: DEFAULT_TERMINAL_FONT_FAMILY,
  },
  {
    label: 'MesloLGS NF / Hack Nerd Font (Powerline)',
    value: '"MesloLGS NF", "Hack Nerd Font Mono", "Hack Nerd Font", Menlo, Monaco, monospace',
  },
  { label: 'MesloLGS NF', value: '"MesloLGS NF", Menlo, Monaco, monospace' },
  { label: 'Hack Nerd Font Mono', value: '"Hack Nerd Font Mono", "Hack Nerd Font", Menlo, Monaco, monospace' },
  { label: 'Hack Nerd Font', value: '"Hack Nerd Font", Menlo, Monaco, monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'Cascadia Code', value: '"Cascadia Code", monospace' },
  { label: 'SF Mono', value: '"SF Mono", Menlo, Monaco, monospace' },
  { label: 'Roboto Mono', value: '"Roboto Mono", monospace' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
  { label: 'Ubuntu Mono', value: '"Ubuntu Mono", monospace' },
  { label: 'Monaco', value: 'Monaco, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'monospace', value: 'monospace' },
]

export function sanitizeTerminalFontSize(value: number | null | undefined): number {
  const raw = Number(value ?? DEFAULT_TERMINAL_FONT_SIZE)
  if (!Number.isFinite(raw)) return DEFAULT_TERMINAL_FONT_SIZE
  return Math.min(32, Math.max(9, Math.round(raw)))
}

export function sanitizeTerminalFontFamily(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_TERMINAL_FONT_FAMILY
}
