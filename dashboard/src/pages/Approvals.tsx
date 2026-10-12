import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { post } from '../lib/api'
import { useApprovals } from '../lib/queries'
import { ago, clock, pretty } from '../lib/format'
import { Button, Empty, ErrorNote, Panel, Skeleton, useToast } from '../components/ui'

type Tab = 'pending' | 'history'

export default function Approvals() {
  const [tab, setTab] = useState<Tab>('pending')
  const pending = useApprovals('pending')
  const history = useApprovals('history')
  const qc = useQueryClient()
  const toast = useToast()
  const counts = pending.data?.counts

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      post(`/api/approvals/${encodeURIComponent(id)}/${action}`, {}),
    onSuccess: (_d, v) => {
      toast(v.action === 'approve' ? 'Approved. The agent may proceed.' : 'Rejected. The action stays blocked.')
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const sendTest = useMutation({
    mutationFn: () => post('/api/approvals/test', {}),
    onSuccess: () => {
      toast('Test request sent')
      qc.invalidateQueries({ queryKey: ['approvals'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const active = tab === 'pending' ? pending : history
  const list = active.data?.approvals || []

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Approvals" className="flex gap-1 rounded-md border border-line bg-coal p-1 w-fit">
        {([
          ['pending', `Pending ${counts?.pending ?? 0}`],
          ['history', `History ${(counts?.approved ?? 0) + (counts?.rejected ?? 0)}`],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`num rounded px-3 py-1 text-[13px] ${tab === k ? 'bg-lift text-paper' : 'text-dim hover:text-paper'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {active.error && <ErrorNote message={(active.error as Error).message} />}

      {active.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : list.length === 0 ? (
        <Panel>
          {tab === 'pending' ? (
            <Empty
              title="All clear"
              text="No action is waiting for a decision. When an agent attempts something risky, it lands here first."
              action={
                <Button onClick={() => sendTest.mutate()} disabled={sendTest.isPending}>
                  Send a test request
                </Button>
              }
            />
          ) : (
            <Empty title="No decisions yet" text="Every approval and rejection is recorded here with who decided and when." />
          )}
        </Panel>
      ) : tab === 'pending' ? (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id} className="rounded-lg border border-amber/40 bg-coal p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-display text-[16px]">{a.tool_name}</span>
                  <span className="ml-3 text-dim">requested by {a.agent_id}</span>
                </div>
                <span className="text-[13px] text-faint">{ago(a.created_at)}</span>
              </div>
              {a.reason && <p className="mt-2 text-[13.5px] text-paper">{a.reason}</p>}
              {a.params != null && pretty(a.params) !== '{}' && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-line bg-ink p-3 font-mono text-[12px] leading-5 whitespace-pre-wrap break-words text-paper/90">
                  {pretty(a.params)}
                </pre>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: a.id, action: 'approve' })}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: a.id, action: 'reject' })}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <ul>
            {list.map((a) => (
              <li key={a.id} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/60 px-4 py-2.5 text-[13px] last:border-0">
                <span style={{ color: a.status === 'approved' ? 'var(--color-allow)' : 'var(--color-block)' }}>
                  {a.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
                <span className="truncate">
                  <span className="text-paper">{a.tool_name}</span>
                  <span className="ml-2 text-dim">{a.agent_id}</span>
                </span>
                <span className="num text-faint">
                  {a.resolved_by ? `${a.resolved_by} · ` : ''}
                  {clock(a.resolved_at)} · {ago(a.resolved_at)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
