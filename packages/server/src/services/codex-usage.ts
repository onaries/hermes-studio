import { existsSync, readdirSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getDb, isSqliteAvailable } from '../db'
import { logger } from './logger'
import type { UsageStatsDailyRow, UsageStatsModelRow } from '../db/hermes/usage-store'

export interface CodexTokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  reasoningTokens: number
  totalTokens: number
  contextLimit?: number
  model?: string
}

export interface CodexAgentUsageRow {
  source: string
  agent: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  reasoning_tokens: number
  sessions: number
}

export interface CodexCodingAgentUsageStats {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  reasoning_tokens: number
  sessions: number
  by_model: UsageStatsModelRow[]
  by_day: UsageStatsDailyRow[]
  by_agent: CodexAgentUsageRow[]
}

interface TokenBucket {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  reasoningTokens: number
  totalTokens: number
}

function finiteToken(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(numeric) || numeric < 0) return undefined
  return Math.floor(numeric)
}

function normalizeTokenBucket(value: any): TokenBucket | null {
  if (!value || typeof value !== 'object') return null
  const inputTokens = finiteToken(value.input_tokens ?? value.inputTokens ?? value.prompt_tokens ?? value.promptTokens) ?? 0
  const outputTokens = finiteToken(value.output_tokens ?? value.outputTokens ?? value.completion_tokens ?? value.completionTokens) ?? 0
  const cacheReadTokens = finiteToken(value.cached_input_tokens ?? value.cachedInputTokens ?? value.cache_read_tokens ?? value.cacheReadTokens) ?? 0
  const reasoningTokens = finiteToken(value.reasoning_output_tokens ?? value.reasoningOutputTokens ?? value.reasoning_tokens ?? value.reasoningTokens) ?? 0
  const totalTokens = finiteToken(value.total_tokens ?? value.totalTokens) ?? inputTokens + outputTokens
  if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0 && reasoningTokens === 0 && totalTokens === 0) return null
  return { inputTokens, outputTokens, cacheReadTokens, reasoningTokens, totalTokens }
}

function addBuckets(target: TokenBucket, next: TokenBucket): void {
  target.inputTokens += next.inputTokens
  target.outputTokens += next.outputTokens
  target.cacheReadTokens += next.cacheReadTokens
  target.reasoningTokens += next.reasoningTokens
  target.totalTokens += next.totalTokens
}

function emptyBucket(): TokenBucket {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, reasoningTokens: 0, totalTokens: 0 }
}

function bucketWeight(bucket: TokenBucket | null): number {
  if (!bucket) return 0
  return bucket.totalTokens || bucket.inputTokens + bucket.outputTokens
}

export function parseCodexTokenUsageJsonl(content: string): CodexTokenUsage | null {
  let latestTotal: TokenBucket | null = null
  const summedLast = emptyBucket()
  let sawLast = false
  let contextLimit: number | undefined
  let model = ''

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue
    let item: any
    try {
      item = JSON.parse(line)
    } catch {
      continue
    }

    const payload = item?.payload
    if (item?.type === 'turn_context' && payload && typeof payload === 'object') {
      if (!model && typeof payload.model === 'string') model = payload.model.trim()
    }

    if (item?.type !== 'event_msg' || payload?.type !== 'token_count') continue
    const info = payload.info && typeof payload.info === 'object' ? payload.info : payload
    const total = normalizeTokenBucket(info.total_token_usage ?? info.totalTokenUsage)
    if (total) latestTotal = total
    const last = normalizeTokenBucket(info.last_token_usage ?? info.lastTokenUsage)
    if (last) {
      sawLast = true
      addBuckets(summedLast, last)
    }
    contextLimit = finiteToken(info.model_context_window ?? info.modelContextWindow) ?? contextLimit
  }

  const bySum = sawLast ? summedLast : null
  const chosen = bucketWeight(bySum) >= bucketWeight(latestTotal) ? bySum : latestTotal
  if (!chosen) return null
  return {
    inputTokens: chosen.inputTokens,
    outputTokens: chosen.outputTokens,
    cacheReadTokens: chosen.cacheReadTokens,
    reasoningTokens: chosen.reasoningTokens,
    totalTokens: chosen.totalTokens,
    ...(contextLimit ? { contextLimit } : {}),
    ...(model ? { model } : {}),
  }
}

function codexSessionsRoot(): string {
  const base = process.env.CODEX_HOME?.trim() || join(homedir(), '.codex')
  return join(base, 'sessions')
}

function findCodexSessionJsonl(nativeSessionId: string): string | null {
  const id = nativeSessionId.trim()
  if (!id) return null
  const root = codexSessionsRoot()
  if (!existsSync(root)) return null

  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()!
    let entries: any[]
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' }) as any[]
    } catch {
      continue
    }
    for (const entry of entries) {
      const entryName = String(entry.name)
      const path = join(dir, entryName)
      if (entry.isDirectory()) {
        stack.push(path)
        continue
      }
      if (entry.isFile() && entryName.endsWith('.jsonl') && entryName.includes(id)) return path
    }
  }
  return null
}

export function parseCodexLatestContextUsageJsonl(content: string): CodexTokenUsage | null {
  let latestLast: TokenBucket | null = null
  let latestTotal: TokenBucket | null = null
  let contextLimit: number | undefined
  let model = ''

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue
    let item: any
    try {
      item = JSON.parse(line)
    } catch {
      continue
    }

    const payload = item?.payload
    if (item?.type === 'turn_context' && payload && typeof payload === 'object') {
      if (!model && typeof payload.model === 'string') model = payload.model.trim()
    }

    if (item?.type !== 'event_msg' || payload?.type !== 'token_count') continue
    const info = payload.info && typeof payload.info === 'object' ? payload.info : payload
    latestTotal = normalizeTokenBucket(info.total_token_usage ?? info.totalTokenUsage) || latestTotal
    latestLast = normalizeTokenBucket(info.last_token_usage ?? info.lastTokenUsage ?? info.last) || latestLast
    contextLimit = finiteToken(info.model_context_window ?? info.modelContextWindow) ?? contextLimit
  }

  const chosen = latestLast || latestTotal
  if (!chosen) return null
  return {
    inputTokens: chosen.inputTokens,
    outputTokens: chosen.outputTokens,
    cacheReadTokens: chosen.cacheReadTokens,
    reasoningTokens: chosen.reasoningTokens,
    totalTokens: chosen.totalTokens,
    ...(contextLimit ? { contextLimit } : {}),
    ...(model ? { model } : {}),
  }
}

export function readCodexTokenUsageForNativeSession(nativeSessionId: string): CodexTokenUsage | null {
  const file = findCodexSessionJsonl(nativeSessionId)
  if (!file) return null
  try {
    return parseCodexTokenUsageJsonl(readFileSync(file, 'utf-8'))
  } catch (err) {
    logger.warn({ err, nativeSessionId, file }, '[codex-usage] failed to read Codex usage log')
    return null
  }
}

export function readCodexLatestContextUsageForNativeSession(nativeSessionId: string): CodexTokenUsage | null {
  const file = findCodexSessionJsonl(nativeSessionId)
  if (!file) return null
  try {
    return parseCodexLatestContextUsageJsonl(readFileSync(file, 'utf-8'))
  } catch (err) {
    logger.warn({ err, nativeSessionId, file }, '[codex-usage] failed to read latest Codex context usage log')
    return null
  }
}

function hasColumn(columns: Set<string>, column: string): boolean {
  return columns.has(column)
}

function dateKey(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10)
}

function addModelUsage(map: Map<string, UsageStatsModelRow>, model: string, usage: CodexTokenUsage): void {
  const key = model || 'codex'
  const row = map.get(key) || {
    model: key,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    reasoning_tokens: 0,
    sessions: 0,
  }
  row.input_tokens += usage.inputTokens
  row.output_tokens += usage.outputTokens
  row.cache_read_tokens += usage.cacheReadTokens
  row.reasoning_tokens += usage.reasoningTokens
  row.sessions += 1
  map.set(key, row)
}

function addDayUsage(map: Map<string, UsageStatsDailyRow>, date: string, usage: CodexTokenUsage): void {
  const row = map.get(date) || {
    date,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    sessions: 0,
    errors: 0,
    cost: 0,
  }
  row.input_tokens += usage.inputTokens
  row.output_tokens += usage.outputTokens
  row.cache_read_tokens += usage.cacheReadTokens
  row.sessions += 1
  map.set(date, row)
}

export function getCodexCodingAgentUsageStats(days = 30, profile?: string): CodexCodingAgentUsageStats {
  const empty: CodexCodingAgentUsageStats = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    reasoning_tokens: 0,
    sessions: 0,
    by_model: [],
    by_day: [],
    by_agent: [],
  }
  if (!isSqliteAvailable()) return empty
  const db = getDb()
  if (!db) return empty

  const columns = new Set((db.prepare('PRAGMA table_info(sessions)').all() as Array<{ name?: string }>).map(row => String(row.name || '')))
  if (!hasColumn(columns, 'agent_native_session_id') || !hasColumn(columns, 'agent')) return empty

  const safeDays = Math.max(1, Math.floor(Number.isFinite(days) ? days : 30))
  const since = Math.floor(Date.now() / 1000) - safeDays * 24 * 60 * 60
  const where = ["source = 'coding_agent'", "agent = 'codex'", 'started_at > ?', "COALESCE(agent_native_session_id, '') != ''"]
  const params: any[] = [since]
  if (profile && hasColumn(columns, 'profile')) {
    where.push('profile = ?')
    params.push(profile)
  }

  const rows = db.prepare(`
    SELECT id, title, model, started_at, agent_native_session_id,
      input_tokens, output_tokens, cache_read_tokens, reasoning_tokens
    FROM sessions
    WHERE ${where.join(' AND ')}
  `).all(...params) as Array<Record<string, any>>

  const byModel = new Map<string, UsageStatsModelRow>()
  const byDay = new Map<string, UsageStatsDailyRow>()
  const agentRow: CodexAgentUsageRow = {
    source: 'coding_agent',
    agent: 'codex',
    model: 'codex',
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    reasoning_tokens: 0,
    sessions: 0,
  }

  for (const row of rows) {
    const usage = readCodexTokenUsageForNativeSession(String(row.agent_native_session_id || ''))
    if (!usage) continue
    const model = usage.model || String(row.model || '').trim() || 'codex'

    try {
      db.prepare(`
        UPDATE sessions
        SET input_tokens = ?,
            output_tokens = ?,
            cache_read_tokens = ?,
            reasoning_tokens = ?,
            model = CASE WHEN COALESCE(model, '') = '' THEN ? ELSE model END
        WHERE id = ?
      `).run(
        usage.inputTokens,
        usage.outputTokens,
        usage.cacheReadTokens,
        usage.reasoningTokens,
        model,
        row.id,
      )
    } catch (err) {
      logger.warn({ err, sessionId: row.id }, '[codex-usage] failed to persist Codex token usage')
    }

    empty.input_tokens += usage.inputTokens
    empty.output_tokens += usage.outputTokens
    empty.cache_read_tokens += usage.cacheReadTokens
    empty.reasoning_tokens += usage.reasoningTokens
    empty.sessions += 1

    agentRow.input_tokens += usage.inputTokens
    agentRow.output_tokens += usage.outputTokens
    agentRow.cache_read_tokens += usage.cacheReadTokens
    agentRow.reasoning_tokens += usage.reasoningTokens
    agentRow.sessions += 1

    addModelUsage(byModel, model, usage)
    addDayUsage(byDay, dateKey(Number(row.started_at || 0)), usage)
  }

  empty.by_model = [...byModel.values()].sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens))
  empty.by_day = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  empty.by_agent = agentRow.sessions > 0 ? [agentRow] : []
  return empty
}
