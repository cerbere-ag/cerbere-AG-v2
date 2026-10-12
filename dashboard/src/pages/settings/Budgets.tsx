import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { del, put, type Budget } from '../../lib/api'
import { useAgents, useBudgets } from '../../lib/queries'
import { usd } from '../../lib/format'
import { Button, Empty, ErrorNote, Field, Input, Panel, ProgressBar, Select, Skeleton, useArm, useToast } from '../../components/ui'

export default function Budgets() {
  const { data, isLoading, error } = useBudgets()
  const agents = useAgents().data?.agents || []
  const qc = useQueryClient()
  const toast = useToast()
  const [agent, setAgent] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('daily')
  const [action, setAction] = useState('warn')
  const { armed, arm, reset } = useArm()

  const save = useMutation({
    mutationFn: () => put<Budget>(`/api/budgets/${encodeURIComponent(agent.trim())}`, { max_budget_usd: Number(amount), period, action_on_exceed: action }),
    onSuccess: () => {
      toast('Budget saved')
      setAmount('')
      qc.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/budgets/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast('Budget removed')
      qc.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const budgets = data?.budgets || []
  const valid = agent.trim() !== '' && amount !== '' && Number(amount) >= 0 && Number.isFinite(Number(amount))

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-dim">Cap what an agent can spend. With Warn, Cerbere alerts you when the limit is crossed; with Block, it refuses the agent's calls until the period resets.</p>
      {error && <ErrorNote message={(error as Error).message} />}

      <Panel title="Set a budget">
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Agent">
            <Input list="agent-ids" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="agent id" />
            <datalist id="agent-ids">
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id} />
              ))}
            </datalist>
          </Field>
          <Field label="Limit (USD)">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" />
          </Field>
          <Field label="Period">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={['daily', 'weekly', 'monthly']} />
          </Field>
          <Field label="When exceeded">
            <Select value={action} onChange={(e) => setAction(e.target.value)} options={[{ value: 'warn', label: 'Warn' }, { value: 'block', label: 'Block' }]} />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="w-full">
              Save budget
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Budgets">
        {isLoading ? (
          <Skeleton className="m-4 h-20" />
        ) : budgets.length === 0 ? (
          <Empty title="No budget set" text="Without a budget, an agent can spend without limit. Add one above." />
        ) : (
          <ul>
            {budgets.map((b) => (
              <li key={b.agent_id} className="grid grid-cols-1 items-center gap-3 border-b border-line/60 px-4 py-3 text-[13px] last:border-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto]">
                <div>
                  <div className="text-paper">{b.agent_id}</div>
                  <div className="text-faint">
                    {b.period} · {b.action_on_exceed === 'block' ? 'blocks when exceeded' : 'warns when exceeded'}
                  </div>
                </div>
                <div>
                  <div className="num mb-1 flex justify-between text-dim">
                    <span style={{ color: b.exceeded ? 'var(--color-block)' : undefined }}>
                      {usd(b.spent_usd)} of {usd(b.max_budget_usd)}
                    </span>
                    <span>{b.pct}%</span>
                  </div>
                  <ProgressBar pct={b.pct} color={b.exceeded ? 'var(--color-block)' : b.pct >= 80 ? 'var(--color-amber)' : 'var(--color-allow)'} />
                </div>
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  aria-label={`Remove budget for ${b.agent_id}`}
                  onClick={() => {
                    if (armed === b.agent_id) {
                      reset()
                      remove.mutate(b.agent_id)
                    } else arm(b.agent_id)
                  }}
                >
                  {armed === b.agent_id ? 'Click again to confirm' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
