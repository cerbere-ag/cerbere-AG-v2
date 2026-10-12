import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFlow } from '../lib/queries'
import { SENSITIVE, TAINT_COLOR } from '../lib/taint'
import { pct } from '../lib/format'
import { Empty, ErrorNote, Panel, Segmented, Skeleton } from '../components/ui'

const EChart = lazy(() => import('../components/EChart'))
const RANGES = [7, 14, 30, 90].map((d) => ({ value: d, label: `${d} days` }))
const label = (name: string) => name.split(':').slice(1).join(':')

export default function Flow() {
  const [days, setDays] = useState(14)
  const { data, isLoading, error } = useFlow(days)
  const navigate = useNavigate()
  const links = data?.links || []

  const stats = useMemo(() => {
    const total = links.reduce((a, l) => a + l.value, 0)
    const blocked = links.reduce((a, l) => a + l.blocked, 0)
    const sensitive = links.filter((l) => SENSITIVE.has(l.source)).reduce((a, l) => a + l.value, 0)
    return { total, blocked, sensitiveShare: total ? (sensitive / total) * 100 : 0 }
  }, [links])

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        backgroundColor: '#242428',
        borderColor: '#2a2a2f',
        textStyle: { color: '#ece7dc' },
        formatter: (p: { dataType: string; name: string; data: { source?: string; target?: string; value?: number; blocked?: number } }) =>
          p.dataType === 'edge'
            ? `${label(p.data.source || '')} → ${label(p.data.target || '')}<br/>${p.data.value} calls · ${p.data.blocked} blocked`
            : label(p.name),
      },
      series: [
        {
          type: 'sankey',
          left: 8,
          right: 150,
          top: 8,
          bottom: 8,
          nodeWidth: 14,
          nodeGap: 14,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'source', curveness: 0.5, opacity: 0.4 },
          label: { color: '#ece7dc', fontSize: 12, formatter: (p: { name: string }) => label(p.name) },
          data: [
            ...(data?.sources || []).map((s) => ({ name: `src:${s}`, itemStyle: { color: TAINT_COLOR[s] || '#8e8b85' } })),
            ...(data?.targets || []).map((t) => ({ name: `tool:${t}`, itemStyle: { color: '#ece7dc' } })),
          ],
          links: links.map((l) => ({ source: `src:${l.source}`, target: `tool:${l.target}`, value: l.value, blocked: l.blocked })),
        },
      ],
    }),
    [data, links],
  )

  const goFeed = (q: string) => navigate(`/feed?q=${encodeURIComponent(q)}`)
  const height = Math.min(640, Math.max(300, (data?.targets.length || 0) * 44))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-dim">
          Where sensitive data goes. Each band joins a data classification to the tool that received it; the wider the band, the more calls.
        </p>
        <Segmented value={days} onChange={setDays} options={RANGES} label="Period" />
      </div>
      {error && <ErrorNote message={(error as Error).message} />}

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : links.length === 0 ? (
        <Panel>
          <Empty
            title="No data flows recorded yet"
            text="Flows appear once your agent classifies its inputs with track_input(). Until then, Cerbere has nothing to trace from source to tool."
            action={
              <Link to="/settings?tab=connect" className="text-[13px] text-amber hover:underline">
                See the integration snippets
              </Link>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="num grid gap-4 sm:grid-cols-3">
            {[
              ['Tracked calls', stats.total.toLocaleString(), undefined],
              ['Blocked', stats.blocked.toLocaleString(), stats.blocked ? 'var(--color-block)' : undefined],
              ['From sensitive data', pct(stats.sensitiveShare), stats.sensitiveShare > 50 ? 'var(--color-amber)' : undefined],
            ].map(([k, v, c]) => (
              <div key={k} className="rounded-lg border border-line bg-coal p-4">
                <div className="text-[13px] text-dim">{k}</div>
                <div className="mt-1 font-display text-[28px] leading-9" style={{ color: c || 'var(--color-paper)' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          <Panel title="Data classification to tool">
            <div className="px-2 pb-3">
              <Suspense fallback={<Skeleton className="m-2 h-72" />}>
                <EChart
                  option={option}
                  height={height}
                  label="Sankey diagram of data classifications flowing into tools"
                  onClick={(p) => {
                    if (p.dataType === 'node' && String(p.name).startsWith('tool:')) goFeed(label(p.name))
                    if (p.dataType === 'edge') goFeed(label(p.data.target))
                  }}
                />
              </Suspense>
            </div>
            <p className="px-4 pb-3 text-[12.5px] text-faint">Click a tool or a band to see its events in the live feed.</p>
          </Panel>

          <Panel title="Largest flows">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="text-[12.5px] text-faint">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-normal">Data</th>
                    <th className="px-4 py-2 font-normal">Tool</th>
                    <th className="px-4 py-2 font-normal">Calls</th>
                    <th className="px-4 py-2 font-normal">Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {links.slice(0, 15).map((l) => (
                    <tr key={`${l.source}|${l.target}`} className="cursor-pointer border-b border-line/60 hover:bg-slab" onClick={() => goFeed(l.target)}>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden className="size-2 rounded-full" style={{ background: TAINT_COLOR[l.source] || '#8e8b85' }} />
                          {l.source}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-paper">{l.target}</td>
                      <td className="num px-4 py-2 text-dim">{l.value.toLocaleString()}</td>
                      <td className="num px-4 py-2" style={{ color: l.blocked ? 'var(--color-block)' : 'var(--color-faint)' }}>
                        {l.blocked.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
