import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTraces } from '../lib/queries'
import { ago, shortId, usd } from '../lib/format'
import { Empty, ErrorNote, Panel, Skeleton } from '../components/ui'

export default function Traces() {
  const { data, isLoading, error } = useTraces()
  const [, setParams] = useSearchParams()
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (data || []).filter((t) => !needle || t.trace_id.toLowerCase().includes(needle))
  }, [data, q])

  const open = (id: string) =>
    setParams(
      (p) => {
        p.set('trace', id)
        p.delete('span')
        return p
      },
      { replace: true },
    )

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={(error as Error).message} />}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by trace id"
        aria-label="Filter traces"
        className="w-full max-w-sm rounded-md border border-line bg-coal px-3 py-1.5 text-[13px] text-paper placeholder:text-faint"
      />
      <Panel>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty
            title={data?.length ? 'No trace matches' : 'No traces yet'}
            text={data?.length ? 'Check the id and try again.' : 'Each agent run is recorded as a trace, a sequence of the calls it made.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[12.5px] text-faint">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-normal">Trace</th>
                  <th className="px-4 py-2 font-normal">Spans</th>
                  <th className="px-4 py-2 font-normal">Blocked</th>
                  <th className="px-4 py-2 font-normal">Cost</th>
                  <th className="px-4 py-2 font-normal">Detected by</th>
                  <th className="px-4 py-2 font-normal">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.trace_id} className="cursor-pointer border-b border-line/60 hover:bg-slab" onClick={() => open(t.trace_id)}>
                    <td className="px-4 py-2">
                      <button className="font-mono text-[12.5px] text-paper" onClick={() => open(t.trace_id)}>
                        {shortId(t.trace_id, 16)}
                      </button>
                    </td>
                    <td className="num px-4 py-2 text-dim">{t.span_count}</td>
                    <td className="num px-4 py-2" style={{ color: t.blocked_count ? 'var(--color-block)' : 'var(--color-faint)' }}>
                      {t.blocked_count || 0}
                    </td>
                    <td className="num px-4 py-2 text-dim">{usd(t.total_cost)}</td>
                    <td className="px-4 py-2 text-dim">{t.detection_layers || '—'}</td>
                    <td className="px-4 py-2 text-dim">{ago(t.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
