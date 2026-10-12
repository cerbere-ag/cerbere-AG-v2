import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '../lib/queries'
import { riskColor, TAINT_COLOR } from '../lib/taint'
import { Empty, ErrorNote, Panel, Segmented, Skeleton } from '../components/ui'

const EChart = lazy(() => import('../components/EChart'))
const RANGES = [7, 14, 30, 90].map((d) => ({ value: d, label: `${d} days` }))
const SYMBOL = { agent: 'circle', tool: 'roundRect', data: 'diamond' } as const

export default function AgentGraph() {
  const [days, setDays] = useState(14)
  const { data, isLoading, error } = useGraph(days)
  const navigate = useNavigate()
  const nodes = data?.nodes || []

  const option = useMemo(
    () => ({
      tooltip: {
        backgroundColor: '#242428',
        borderColor: '#2a2a2f',
        textStyle: { color: '#ece7dc' },
        formatter: (p: { dataType: string; data: { label?: string; kind?: string; calls?: number; blocked?: number; risk?: number | null } }) =>
          p.dataType === 'node'
            ? `${p.data.label}<br/>${p.data.kind} · ${p.data.calls} calls · ${p.data.blocked} blocked${p.data.risk != null ? ` · risk ${p.data.risk}` : ''}`
            : 'link',
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          force: { repulsion: 280, edgeLength: [70, 170], gravity: 0.08 },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 6,
          emphasis: { focus: 'adjacency' },
          label: { show: true, position: 'right', color: '#ece7dc', fontSize: 12, formatter: (p: { data: { label: string } }) => p.data.label },
          data: nodes.map((n) => ({
            id: n.id,
            name: n.id,
            label: n.label,
            kind: n.kind,
            calls: n.calls,
            blocked: n.blocked,
            risk: n.risk,
            symbol: SYMBOL[n.kind],
            symbolSize: 16 + Math.min(40, Math.log2(n.calls + 1) * 7),
            itemStyle: { color: n.kind === 'data' ? TAINT_COLOR[n.label] || '#8e8b85' : n.kind === 'agent' ? '#ece7dc' : riskColor(n.risk) },
          })),
          edges: (data?.edges || []).map((e) => ({
            source: e.source,
            target: e.target,
            lineStyle: { width: 1 + Math.min(6, Math.log2(e.calls + 1)), color: e.blocked ? '#e2594f' : '#4a4a50', opacity: 0.85, curveness: 0.1 },
          })),
        },
      ],
    }),
    [data, nodes],
  )

  const legend: [string, string][] = [
    ['Agent', 'rounded-full'],
    ['Tool', 'rounded-[2px]'],
    ['Sensitive data', 'rotate-45 rounded-[1px]'],
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-dim">
          Who uses what. Agents, the tools they call and the data classes that reach those tools. A red link means at least one call was blocked.
        </p>
        <Segmented value={days} onChange={setDays} options={RANGES} label="Period" />
      </div>
      {error && <ErrorNote message={(error as Error).message} />}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : nodes.length === 0 ? (
        <Panel>
          <Empty title="Nothing to draw yet" text="The graph fills in as agents call tools. Each agent and tool becomes a node." />
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-1 pb-2 text-[12.5px] text-dim">
            {legend.map(([name, cls]) => (
              <span key={name} className="flex items-center gap-2">
                <span aria-hidden className={`inline-block size-2.5 bg-paper ${cls}`} />
                {name}
              </span>
            ))}
            <span className="flex items-center gap-2">
              Risk
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: '#5fb08c' }} /> low
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: '#e9a23b' }} /> medium
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: '#e2594f' }} /> high
            </span>
          </div>
          <div className="px-2 pb-3">
            <Suspense fallback={<Skeleton className="m-2 h-[520px]" />}>
              <EChart
                option={option}
                height={520}
                label="Force-directed graph of agents, tools and sensitive data"
                onClick={(p) => {
                  if (p.dataType !== 'node') return
                  if (p.data.kind === 'agent') navigate('/agents')
                  else navigate(`/feed?q=${encodeURIComponent(p.data.label)}`)
                }}
              />
            </Suspense>
          </div>
          <p className="px-4 pb-3 text-[12.5px] text-faint">Drag nodes to rearrange, scroll to zoom. Click an agent to manage it, a tool or data class to see its events.</p>
        </Panel>
      )}
    </div>
  )
}
