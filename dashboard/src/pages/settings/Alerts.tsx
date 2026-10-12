import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { del, post } from '../../lib/api'
import { useAlertRules, useDestinations } from '../../lib/queries'
import { Button, Empty, ErrorNote, Field, Input, Panel, Select, Skeleton, useArm, useToast } from '../../components/ui'

const METRICS = [
  { value: 'cost_usd', label: 'Cost (USD)' },
  { value: 'input_tokens', label: 'Input tokens' },
  { value: 'output_tokens', label: 'Output tokens' },
  { value: 'latency_ms', label: 'Latency (ms)' },
  { value: 'total_spans', label: 'Total calls' },
  { value: 'blocked_spans', label: 'Blocked calls' },
  { value: 'block_rate', label: 'Block rate' },
  { value: 'error_rate', label: 'Error rate' },
]
const COMPARISONS = [
  { value: 'above', label: 'is above' },
  { value: 'below', label: 'is below' },
  { value: 'gte', label: 'is at least' },
  { value: 'lte', label: 'is at most' },
  { value: 'equal', label: 'equals' },
]
const DEST_TYPES = [
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'email', label: 'Email' },
]
const LEVELS = ['critical', 'high', 'medium', 'low']

export default function Alerts() {
  const rulesQ = useAlertRules()
  const destQ = useDestinations()
  const qc = useQueryClient()
  const toast = useToast()
  const { armed, arm, reset } = useArm()

  const [rule, setRule] = useState({ metric: 'cost_usd', comparison: 'above', threshold: '', label: '' })
  const [dest, setDest] = useState({ type: 'slack', url: '' })
  const [levels, setLevels] = useState<string[]>(['critical', 'high'])

  const addRule = useMutation({
    mutationFn: () => post('/api/alert-rules', { metric: rule.metric, comparison: rule.comparison, threshold: Number(rule.threshold), label: rule.label.trim() || undefined }),
    onSuccess: () => {
      toast('Alert created')
      setRule((r) => ({ ...r, threshold: '', label: '' }))
      qc.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const delRule = useMutation({
    mutationFn: (id: string) => del(`/api/alert-rules/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast('Alert removed')
      qc.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const addDest = useMutation({
    mutationFn: () => post('/api/alert-destinations', { type: dest.type, url: dest.url.trim(), levels }),
    onSuccess: () => {
      toast('Destination added')
      setDest((d) => ({ ...d, url: '' }))
      qc.invalidateQueries({ queryKey: ['destinations'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const testDest = useMutation({
    mutationFn: () => post('/api/alert-destinations/test', { type: dest.type, url: dest.url.trim() }),
    onSuccess: () => toast('Test message sent'),
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const delDest = useMutation({
    mutationFn: (id: string) => del(`/api/alert-destinations/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast('Destination removed')
      qc.invalidateQueries({ queryKey: ['destinations'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const rules = rulesQ.data?.alert_rules || []
  const dests = destQ.data?.destinations || []
  const confirm = (id: string, run: () => void) => () => {
    if (armed === id) {
      reset()
      run()
    } else arm(id)
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-dim">An alert fires when a metric crosses your threshold. Destinations decide where it is sent, and for which severity levels.</p>
      {(rulesQ.error || destQ.error) && <ErrorNote message={((rulesQ.error || destQ.error) as Error).message} />}

      <Panel title="New alert">
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Metric">
            <Select value={rule.metric} onChange={(e) => setRule({ ...rule, metric: e.target.value })} options={METRICS} />
          </Field>
          <Field label="Condition">
            <Select value={rule.comparison} onChange={(e) => setRule({ ...rule, comparison: e.target.value })} options={COMPARISONS} />
          </Field>
          <Field label="Threshold">
            <Input type="number" step="any" value={rule.threshold} onChange={(e) => setRule({ ...rule, threshold: e.target.value })} placeholder="5" />
          </Field>
          <Field label="Label" hint="optional">
            <Input value={rule.label} maxLength={200} onChange={(e) => setRule({ ...rule, label: e.target.value })} placeholder="Daily spend" />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" disabled={addRule.isPending || rule.threshold === '' || !Number.isFinite(Number(rule.threshold))} onClick={() => addRule.mutate()}>
              Create alert
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Alerts">
        {rulesQ.isLoading ? (
          <Skeleton className="m-4 h-16" />
        ) : rules.length === 0 ? (
          <Empty title="No alert yet" text="Create one above, for example when daily cost goes above a figure you are comfortable with." />
        ) : (
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 text-[13px] last:border-0">
                <div>
                  <div className="text-paper">{r.label || METRICS.find((m) => m.value === r.metric)?.label || r.metric}</div>
                  <div className="text-faint">
                    {METRICS.find((m) => m.value === r.metric)?.label || r.metric} {COMPARISONS.find((c) => c.value === r.comparison)?.label || r.comparison} {String(r.threshold)}
                  </div>
                </div>
                <Button variant="danger" disabled={delRule.isPending} aria-label="Remove alert" onClick={confirm(r.id, () => delRule.mutate(r.id))}>
                  {armed === r.id ? 'Click again to confirm' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Add a destination">
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <Field label="Type">
            <Select value={dest.type} onChange={(e) => setDest({ ...dest, type: e.target.value })} options={DEST_TYPES} />
          </Field>
          <Field label={dest.type === 'email' ? 'Email address' : 'Webhook URL'}>
            <Input value={dest.url} onChange={(e) => setDest({ ...dest, url: e.target.value })} placeholder={dest.type === 'email' ? 'security@company.com' : 'https://hooks.example.com/…'} />
          </Field>
        </div>
        <fieldset className="px-4 pb-3">
          <legend className="mb-1 text-[12.5px] text-dim">Send alerts of level</legend>
          <div className="flex flex-wrap gap-4">
            {LEVELS.map((l) => (
              <label key={l} className="flex items-center gap-2 text-[13px] text-paper">
                <input type="checkbox" checked={levels.includes(l)} onChange={(e) => setLevels((x) => (e.target.checked ? [...x, l] : x.filter((y) => y !== l)))} className="accent-amber" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2 px-4 pb-4">
          <Button variant="primary" disabled={addDest.isPending || !dest.url.trim() || levels.length === 0} onClick={() => addDest.mutate()}>
            Add destination
          </Button>
          <Button disabled={testDest.isPending || !dest.url.trim()} onClick={() => testDest.mutate()}>
            Send a test
          </Button>
        </div>
      </Panel>

      <Panel title="Destinations">
        {destQ.isLoading ? (
          <Skeleton className="m-4 h-16" />
        ) : dests.length === 0 ? (
          <Empty title="No destination yet" text="Alerts are only shown in the dashboard until you add Slack, Discord, a webhook or an email address." />
        ) : (
          <ul>
            {dests.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 text-[13px] last:border-0">
                <div className="min-w-0">
                  <div className="text-paper">{DEST_TYPES.find((t) => t.value === d.type)?.label || d.type}</div>
                  <div className="truncate font-mono text-[12px] text-faint">{d.url}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-dim">{d.levels.join(', ')}</span>
                  <Button variant="danger" disabled={delDest.isPending} aria-label="Remove destination" onClick={confirm(d.id, () => delDest.mutate(d.id))}>
                    {armed === d.id ? 'Click again to confirm' : 'Remove'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
