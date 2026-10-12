import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, ShieldCheck } from 'lucide-react'
import { get, type AuditVerify, type Decision, type Risk } from '../lib/api'
import { TRAIL_LIMIT, useSummary, useTrail } from '../lib/queries'
import { download, toCsv, toJson, toMarkdown } from '../lib/export'
import { pretty } from '../lib/format'
import { FeedTable } from '../components/FeedTable'
import { Button, Empty, ErrorNote, Field, Panel, Select, Skeleton, useToast } from '../components/ui'

export default function Compliance() {
  const summary = useSummary()
  const trail = useTrail()
  const toast = useToast()
  const [decision, setDecision] = useState<'all' | Decision>('all')
  const [risk, setRisk] = useState<'all' | Risk>('all')
  const [q, setQ] = useState('')

  const verify = useMutation({
    mutationFn: () => get<AuditVerify>('/api/audit/verify'),
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const events = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (trail.data || []).filter((e) => {
      if (decision !== 'all' && e.decision !== decision) return false
      if (risk !== 'all' && e.risk !== risk) return false
      if (!needle) return true
      return [e.agent, e.tool, e.event_type, e.model, e.policy, e.detection, e.trace_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    })
  }, [trail.data, decision, risk, q])

  const s = summary.data
  const stamp = new Date().toISOString().slice(0, 10)
  const stats: [string, number | undefined, string?][] = [
    ['Security events', s?.total],
    ['Blocked', s?.blocked, 'var(--color-block)'],
    ['Flagged', s?.flagged, 'var(--color-amber)'],
    ['Allowed', s?.allowed],
    ['High risk', s?.high_risk],
    ['Critical', s?.critical, 'var(--color-block)'],
    ['Required approval', s?.require_approval],
    ['Agents affected', s?.affected_agents],
  ]

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-dim">
        Evidence for security reviews: the last 14 days at a glance, every event with its decision, and exports you can attach to a report.
      </p>
      {(summary.error || trail.error) && <ErrorNote message={((summary.error || trail.error) as Error).message} />}

      <div className="num grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([k, v, c]) => (
          <div key={k} className="rounded-lg border border-line bg-coal p-4">
            <div className="text-[13px] text-dim">{k}</div>
            {summary.isLoading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <div className="mt-1 font-display text-[26px] leading-8" style={{ color: v ? c || 'var(--color-paper)' : 'var(--color-faint)' }}>
                {(v ?? 0).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      <Panel title="Audit trail integrity">
        <div className="flex flex-wrap items-center gap-4 px-4 pb-4">
          <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
            <ShieldCheck size={14} /> {verify.isPending ? 'Verifying…' : 'Verify audit chain'}
          </Button>
          {verify.data && (
            <span className="text-[13px]" style={{ color: verify.data.valid ? 'var(--color-allow)' : 'var(--color-block)' }}>
              {verify.data.valid ? 'Audit chain intact' : 'Audit chain broken'}
              <span className="ml-2 text-faint">checked {new Date(verify.data.verified_at + 'Z').toLocaleTimeString()}</span>
            </span>
          )}
        </div>
        {verify.data && !verify.data.valid && (
          <pre className="mx-4 mb-4 max-h-56 overflow-auto rounded-md border border-line bg-ink p-3 font-mono text-[12px] whitespace-pre-wrap text-paper/90">
            {pretty(verify.data.report)}
          </pre>
        )}
      </Panel>

      <Panel
        title="Security events"
        action={
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['CSV', () => download(toCsv(events), `cerbere-audit-${stamp}.csv`, 'text/csv')],
                ['JSON', () => download(toJson(events), `cerbere-audit-${stamp}.json`, 'application/json')],
                ['Markdown', () => download(toMarkdown(events, s), `cerbere-audit-${stamp}.md`, 'text/markdown')],
              ] as [string, () => void][]
            ).map(([name, fn]) => (
              <Button key={name} onClick={fn} disabled={events.length === 0} aria-label={`Export ${events.length} events as ${name}`}>
                <Download size={13} /> {name}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 px-4 pb-3 sm:grid-cols-3">
          <Field label="Decision">
            <Select value={decision} onChange={(e) => setDecision(e.target.value as 'all' | Decision)} options={['all', 'blocked', 'flagged', 'allowed']} />
          </Field>
          <Field label="Risk">
            <Select value={risk} onChange={(e) => setRisk(e.target.value as 'all' | Risk)} options={['all', 'critical', 'high', 'medium', 'low']} />
          </Field>
          <Field label="Search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Agent, tool, policy or trace id"
              className="w-full rounded-md border border-line bg-ink px-3 py-1.5 text-[13px] text-paper placeholder:text-faint"
            />
          </Field>
        </div>
        {trail.isLoading ? (
          <Skeleton className="m-4 h-40" />
        ) : events.length === 0 ? (
          <Empty title="No event matches" text="Change the filters, or wait for the first events." />
        ) : (
          <FeedTable events={events} />
        )}
        <p className="px-4 py-3 text-[12.5px] text-faint">
          Exports contain the {events.length.toLocaleString()} events shown here, out of the {TRAIL_LIMIT} most recent. Cells that start with a formula character are neutralised in CSV.
        </p>
      </Panel>
    </div>
  )
}
