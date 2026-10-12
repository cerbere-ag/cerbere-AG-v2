import type { AuditEvent, AuditSummary } from './api'

// Un tableur interprète =, +, -, @ en début de cellule comme une formule : on neutralise.
function cell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const COLS: [keyof AuditEvent, string][] = [
  ['timestamp', 'timestamp'],
  ['decision', 'decision'],
  ['risk', 'risk'],
  ['agent', 'agent'],
  ['event_type', 'event_type'],
  ['tool', 'tool'],
  ['model', 'model'],
  ['detection', 'detection'],
  ['policy', 'policy'],
  ['trace_id', 'trace_id'],
  ['span_id', 'span_id'],
]

export function toCsv(events: AuditEvent[]): string {
  const head = COLS.map(([, h]) => h).join(',')
  const rows = events.map((e) => COLS.map(([k]) => cell(e[k])).join(','))
  return [head, ...rows].join('\n')
}

export function toJson(events: AuditEvent[]): string {
  return JSON.stringify(events, null, 2)
}

function md(v: unknown): string {
  return String(v ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function toMarkdown(events: AuditEvent[], summary?: AuditSummary): string {
  const lines = ['# Cerbere security audit', '', `Generated ${new Date().toISOString()} · ${events.length} events`, '']
  if (summary) {
    lines.push('## Last 14 days', '')
    lines.push(`- Total: ${summary.total}`, `- Blocked: ${summary.blocked}`, `- Flagged: ${summary.flagged}`)
    lines.push(`- High risk: ${summary.high_risk}`, `- Critical: ${summary.critical}`, `- Require approval: ${summary.require_approval}`)
    lines.push(`- Agents affected: ${summary.affected_agents}`, '')
  }
  lines.push('## Events', '', '| Time | Decision | Risk | Agent | Action | Detection or policy |', '|---|---|---|---|---|---|')
  for (const e of events) {
    lines.push(`| ${md(e.timestamp)} | ${md(e.decision)} | ${md(e.risk)} | ${md(e.agent)} | ${md(e.tool || e.event_type)} | ${md(e.policy || e.detection)} |`)
  }
  return lines.join('\n')
}

export function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
