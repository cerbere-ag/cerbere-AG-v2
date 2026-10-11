import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { useTrail } from '../lib/queries'
import type { AuditEvent, Decision } from '../lib/api'
import { FeedTable } from '../components/FeedTable'
import { Button, Empty, ErrorNote, Panel, Skeleton } from '../components/ui'

type Filter = 'all' | Decision
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'allowed', label: 'Allowed' },
]

export default function Feed() {
  const [params, setParams] = useSearchParams()
  const { data, isLoading, error } = useTrail()
  const [paused, setPaused] = useState(false)
  const [frozen, setFrozen] = useState<AuditEvent[]>([])
  const [q, setQ] = useState('')

  const raw: Filter = (['blocked', 'flagged', 'allowed'] as const).includes(params.get('decision') as Decision)
    ? (params.get('decision') as Decision)
    : 'all'
  const events = paused ? frozen : data || []

  const counts = useMemo(() => {
    const c = { all: events.length, blocked: 0, flagged: 0, allowed: 0 }
    for (const e of events) c[e.decision]++
    return c
  }, [events])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      if (raw !== 'all' && e.decision !== raw) return false
      if (!needle) return true
      return [e.agent, e.tool, e.event_type, e.model, e.policy, e.detection, e.trace_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    })
  }, [events, raw, q])

  const setFilter = (f: Filter) =>
    setParams(
      (p) => {
        if (f === 'all') p.delete('decision')
        else p.set('decision', f)
        return p
      },
      { replace: true },
    )

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={(error as Error).message} />}
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter by decision" className="flex gap-1 rounded-md border border-line bg-coal p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              aria-pressed={raw === f.key}
              onClick={() => setFilter(f.key)}
              className={`num rounded px-3 py-1 text-[13px] ${raw === f.key ? 'bg-lift text-paper' : 'text-dim hover:text-paper'}`}
            >
              {f.label} <span className="text-faint">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by agent, tool, policy or trace id"
          aria-label="Filter events"
          className="min-w-[240px] flex-1 rounded-md border border-line bg-coal px-3 py-1.5 text-[13px] text-paper placeholder:text-faint"
        />
        <Button
          onClick={() => {
            if (!paused) setFrozen(data || [])
            setPaused((v) => !v)
          }}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      <Panel>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Empty
            title={events.length ? 'No event matches these filters' : 'No decisions yet'}
            text={events.length ? 'Clear the search or pick another decision.' : 'Actions attempted by your agents appear here as they happen.'}
          />
        ) : (
          <FeedTable events={shown} />
        )}
      </Panel>
      {paused && <p className="text-[13px] text-amber">Paused. The list is frozen; new events keep arriving in the background.</p>}
    </div>
  )
}
