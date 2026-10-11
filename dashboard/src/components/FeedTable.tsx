import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AuditEvent } from '../lib/api'
import { clock } from '../lib/format'
import { DecisionBadge, RiskTag } from './ui'

export function FeedTable({ events, compact = false }: { events: AuditEvent[]; compact?: boolean }) {
  const [, setParams] = useSearchParams()
  const seen = useRef<Set<string>>(new Set())
  const booted = useRef(false)

  const fresh = new Set<string>()
  if (booted.current) for (const e of events) if (!seen.current.has(e.event_id)) fresh.add(e.event_id)
  useEffect(() => {
    for (const e of events) seen.current.add(e.event_id)
    booted.current = true
  }, [events])

  const open = (e: AuditEvent) => {
    const id = e.trace_id || e.event_id
    setParams(
      (p) => {
        p.set('trace', id)
        if (e.span_id) p.set('span', e.span_id)
        else p.delete('span')
        return p
      },
      { replace: true },
    )
  }

  const cols = compact
    ? 'grid-cols-[76px_104px_minmax(0,1fr)_minmax(0,1.3fr)]'
    : 'grid-cols-[84px_108px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_70px]'

  return (
    <div className="overflow-x-auto">
      <div className={compact ? 'min-w-[520px]' : 'min-w-[820px]'}>
        <div className={`grid ${cols} gap-3 border-b border-line px-4 py-2 text-[12.5px] text-faint`}>
          <span>Time</span>
          <span>Decision</span>
          <span>Agent</span>
          <span>Action</span>
          {!compact && <span>Detection or policy</span>}
          {!compact && <span>Risk</span>}
        </div>
        <ul>
          {events.map((e) => (
            <li key={e.event_id}>
              <button
                onClick={() => open(e)}
                className={`grid w-full ${cols} items-center gap-3 border-b border-line/60 px-4 py-2 text-left text-[13px] hover:bg-slab ${fresh.has(e.event_id) ? 'row-fresh' : ''}`}
              >
                <span className="num font-mono text-[12.5px] text-dim">{clock(e.timestamp)}</span>
                <DecisionBadge decision={e.decision} />
                <span className="truncate text-paper">{e.agent || '—'}</span>
                <span className="truncate text-paper">
                  {e.tool || e.event_type || '—'}
                  {e.model && <span className="ml-2 text-faint">{e.model}</span>}
                </span>
                {!compact && <span className="truncate text-dim">{e.policy || e.detection || '—'}</span>}
                {!compact && <RiskTag risk={e.risk} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
