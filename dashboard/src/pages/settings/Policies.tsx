import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { del, patch, post, type PolicyRule } from '../../lib/api'
import { useAgents, usePolicies } from '../../lib/queries'
import { Button, Empty, ErrorNote, Field, Input, Panel, Select, Skeleton, useArm, useToast } from '../../components/ui'

const EVENT_TYPES = ['all', 'tool_call', 'llm_call']
const DETECTIONS = ['pii_detection', 'prompt_injection', 'tool_policy', 'budget_policy', 'custom_regex']
const OPERATORS = ['>', '<', '==', 'contains']
const ACTIONS = [
  { value: 'allow', label: 'Allow' },
  { value: 'require_approval', label: 'Require approval' },
  { value: 'block', label: 'Block' },
  { value: 'redact', label: 'Redact' },
]
const ACTION_COLOR: Record<string, string> = {
  allow: 'var(--color-allow)',
  require_approval: 'var(--color-amber)',
  block: 'var(--color-block)',
  redact: 'var(--color-dim)',
}

function sentence(r: PolicyRule) {
  const where = [r.event_type !== 'all' ? r.event_type : 'any call', r.tool_name ? `on ${r.tool_name}` : null].filter(Boolean).join(' ')
  return `${r.detection_type} ${r.operator} ${r.threshold || '…'} · ${where} · ${r.agent_scope === 'all' ? 'all agents' : r.agent_scope}`
}

export default function Policies() {
  const { data, isLoading, error } = usePolicies()
  const agents = useAgents().data?.agents || []
  const qc = useQueryClient()
  const toast = useToast()
  const { armed, arm, reset } = useArm()
  const [f, setF] = useState({ agent_scope: 'all', event_type: 'all', tool_name: '', detection_type: 'pii_detection', operator: '>', threshold: '', action: 'require_approval' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const refresh = () => qc.invalidateQueries({ queryKey: ['policies'] })
  const create = useMutation({
    mutationFn: () => post('/api/policy-rules', { ...f, tool_name: f.tool_name.trim() || null, agent_scope: f.agent_scope.trim() || 'all' }),
    onSuccess: () => {
      toast('Rule added')
      setF((x) => ({ ...x, threshold: '', tool_name: '' }))
      refresh()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const toggle = useMutation({
    mutationFn: (r: PolicyRule) => patch(`/api/policy-rules/${encodeURIComponent(r.id)}`, { enabled: !r.enabled }),
    onSuccess: refresh,
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/policy-rules/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast('Rule removed')
      refresh()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const rules = data?.rules || []
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-dim">Rules decide what happens when a detection crosses a threshold: allow, ask a human, block or redact. They apply to new calls straight away.</p>
      {error && <ErrorNote message={(error as Error).message} />}

      <Panel title="Add a rule">
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Agents" hint="all, or one agent id">
            <Input list="rule-agents" value={f.agent_scope} onChange={set('agent_scope')} />
            <datalist id="rule-agents">
              <option value="all" />
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id} />
              ))}
            </datalist>
          </Field>
          <Field label="Event type">
            <Select value={f.event_type} onChange={set('event_type')} options={EVENT_TYPES} />
          </Field>
          <Field label="Tool" hint="optional">
            <Input value={f.tool_name} onChange={set('tool_name')} placeholder="http_post" />
          </Field>
          <Field label="Detection">
            <Select value={f.detection_type} onChange={set('detection_type')} options={DETECTIONS} />
          </Field>
          <Field label="Operator">
            <Select value={f.operator} onChange={set('operator')} options={OPERATORS} />
          </Field>
          <Field label="Threshold" hint={f.operator === 'contains' ? 'text to look for' : 'a number'}>
            <Input value={f.threshold} onChange={set('threshold')} placeholder={f.operator === 'contains' ? 'password' : '0.8'} />
          </Field>
          <Field label="Action">
            <Select value={f.action} onChange={set('action')} options={ACTIONS} />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" disabled={create.isPending || f.threshold.trim() === ''} onClick={() => create.mutate()}>
              Add rule
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Rules">
        {isLoading ? (
          <Skeleton className="m-4 h-24" />
        ) : rules.length === 0 ? (
          <Empty title="No rule yet" text="Without rules, only the built-in protections apply. Add one above to tighten a specific tool or agent." />
        ) : (
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 text-[13px] last:border-0">
                <div className="min-w-0">
                  <div className="text-paper" style={{ opacity: r.enabled ? 1 : 0.5 }}>{sentence(r)}</div>
                  <div className="mt-0.5" style={{ color: ACTION_COLOR[r.action] || 'var(--color-dim)' }}>
                    → {ACTIONS.find((a) => a.value === r.action)?.label || r.action}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button aria-pressed={r.enabled} disabled={toggle.isPending} onClick={() => toggle.mutate(r)}>
                    {r.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={remove.isPending}
                    aria-label="Remove rule"
                    onClick={() => {
                      if (armed === r.id) {
                        reset()
                        remove.mutate(r.id)
                      } else arm(r.id)
                    }}
                  >
                    {armed === r.id ? 'Click again to confirm' : 'Remove'}
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
