import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { post, type Agent, type AgentState } from '../lib/api'
import { useAgents } from '../lib/queries'
import { ago, usd } from '../lib/format'
import { Button, Empty, ErrorNote, Panel, Skeleton, useToast } from '../components/ui'

const STATE: Record<AgentState, { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'var(--color-allow)' },
  idle: { label: 'Idle', color: 'var(--color-amber)' },
  offline: { label: 'Offline', color: 'var(--color-faint)' },
  disconnected: { label: 'Disconnected', color: 'var(--color-block)' },
}

export default function Agents() {
  const { data, isLoading, error } = useAgents()
  const qc = useQueryClient()
  const toast = useToast()
  const [armed, setArmed] = useState<string | null>(null)

  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(null), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  const toggle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'disconnect' | 'reconnect' }) =>
      post(`/api/agents/${encodeURIComponent(id)}/${action}`, {}),
    onSuccess: (_d, v) => {
      toast(v.action === 'disconnect' ? 'Agent disconnected. Its requests are now refused.' : 'Agent reconnected.')
      qc.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const agents = data?.agents || []
  const counts = data?.counts

  const act = (a: Agent) => {
    if (a.state === 'disconnected') return toggle.mutate({ id: a.agent_id, action: 'reconnect' })
    if (armed === a.agent_id) {
      setArmed(null)
      return toggle.mutate({ id: a.agent_id, action: 'disconnect' })
    }
    setArmed(a.agent_id)
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={(error as Error).message} />}
      {counts && (
        <div className="num flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
          {(Object.keys(STATE) as AgentState[]).map((k) => (
            <span key={k} className="flex items-center gap-2 text-dim">
              <span aria-hidden className="size-2 rounded-full" style={{ background: STATE[k].color }} />
              {STATE[k].label} <span className="text-paper">{counts[k]}</span>
            </span>
          ))}
        </div>
      )}

      <Panel>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Empty
            title="No agent connected"
            text="An agent appears here after its first call with your API key. You can then disconnect it in one click."
            action={
              <a href="/legacy" className="text-[13px] text-amber hover:underline">
                Get your API key
              </a>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="text-[12.5px] text-faint">
                <tr className="border-b border-line">
                  {['Agent', 'State', 'SDK', 'Calls', 'Blocked', 'Cost', 'Waiting', 'Last seen', ''].map((h) => (
                    <th key={h} className="px-4 py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const s = STATE[a.state]
                  const isArmed = armed === a.agent_id
                  return (
                    <tr key={a.agent_id} className="border-b border-line/60">
                      <td className="px-4 py-2.5">
                        <div className="text-paper">{a.name}</div>
                        {a.name !== a.agent_id && <div className="font-mono text-[12px] text-faint">{a.agent_id}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2" style={{ color: s.color }}>
                          <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        {a.state === 'disconnected' && (
                          <div className="text-[12px] text-faint">
                            by {a.disconnected_by || 'a reviewer'} {ago(a.disconnected_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12.5px] text-dim">{a.sdk_version || '—'}</td>
                      <td className="num px-4 py-2.5 text-dim">{a.calls.toLocaleString()}</td>
                      <td className="num px-4 py-2.5" style={{ color: a.blocked ? 'var(--color-block)' : 'var(--color-faint)' }}>
                        {a.blocked.toLocaleString()}
                      </td>
                      <td className="num px-4 py-2.5 text-dim">{usd(a.cost_usd)}</td>
                      <td className="num px-4 py-2.5" style={{ color: a.pending_approvals ? 'var(--color-amber)' : 'var(--color-faint)' }}>
                        {a.pending_approvals}
                      </td>
                      <td className="px-4 py-2.5 text-dim">{ago(a.last_seen_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant={a.state === 'disconnected' ? 'primary' : 'danger'}
                          disabled={toggle.isPending}
                          onClick={() => act(a)}
                          aria-label={`${a.state === 'disconnected' ? 'Reconnect' : 'Disconnect'} ${a.name}`}
                        >
                          {a.state === 'disconnected' ? 'Reconnect' : isArmed ? 'Click again to confirm' : 'Disconnect'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
