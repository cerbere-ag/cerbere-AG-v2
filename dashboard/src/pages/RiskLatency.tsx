import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTools } from '../lib/queries'
import type { ToolStat } from '../lib/api'
import { ms } from '../lib/format'
import { Empty, ErrorNote, Panel, Segmented, Skeleton } from '../components/ui'

const EChart = lazy(() => import('../components/EChart'))
const RANGES = [7, 14, 30, 90].map((d) => ({ value: d, label: `${d} days` }))
const RISK_T = 60 // score de risque moyen à partir duquel un outil est « risqué »
const LAT_T = 500 // latence moyenne (ms) à partir de laquelle un outil est « lent »

type Kind = 'all' | 'tool' | 'llm'

export default function RiskLatency() {
  const [days, setDays] = useState(14)
  const [kind, setKind] = useState<Kind>('all')
  const { data, isLoading, error } = useTools(days)
  const [, setParams] = useSearchParams()

  const tools = useMemo(() => (data?.tools || []).filter((t) => kind === 'all' || t.kind === kind), [data, kind])
  const hot = useMemo(() => tools.filter((t) => t.avg_risk >= RISK_T && t.avg_latency_ms >= LAT_T), [tools])

  const open = (t: ToolStat) => {
    if (!t.trace_id) return
    setParams(
      (p) => {
        p.set('trace', t.trace_id as string)
        p.delete('span')
        return p
      },
      { replace: true },
    )
  }

  const option = useMemo(
    () => ({
      grid: { left: 56, right: 24, top: 24, bottom: 52 },
      tooltip: {
        backgroundColor: '#242428',
        borderColor: '#2a2a2f',
        textStyle: { color: '#ece7dc' },
        formatter: (p: { data: { stat: ToolStat } }) => {
          const t = p.data.stat
          return `${t.tool}<br/>${t.calls} calls · avg ${ms(t.avg_latency_ms)} · p95 ${ms(t.p95_latency_ms)}<br/>avg risk ${t.avg_risk} · ${t.blocked} blocked`
        },
      },
      xAxis: {
        type: 'log',
        name: 'Average latency',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: '#9a968e' },
        axisLabel: { color: '#9a968e', formatter: (v: number) => ms(v) },
        axisLine: { lineStyle: { color: '#2a2a2f' } },
        splitLine: { lineStyle: { color: '#2a2a2f' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: 'Average risk',
        nameTextStyle: { color: '#9a968e' },
        axisLabel: { color: '#9a968e' },
        splitLine: { lineStyle: { color: '#2a2a2f' } },
      },
      series: [
        {
          type: 'scatter',
          data: tools.map((t) => {
            const isHot = t.avg_risk >= RISK_T && t.avg_latency_ms >= LAT_T
            return {
              value: [Math.max(t.avg_latency_ms, 1), t.avg_risk],
              stat: t,
              symbolSize: Math.min(46, 10 + Math.sqrt(t.calls) * 4),
              itemStyle: { color: isHot ? '#e2594f' : t.kind === 'llm' ? '#9a968e' : '#ece7dc', opacity: 0.85 },
            }
          }),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#66635e', type: 'dashed' },
            label: { color: '#66635e' },
            data: [{ yAxis: RISK_T }, { xAxis: LAT_T }],
          },
        },
      ],
    }),
    [tools],
  )

  const sorted = useMemo(() => [...tools].sort((a, b) => b.avg_risk - a.avg_risk || b.avg_latency_ms - a.avg_latency_ms), [tools])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-dim">
          Slow and dangerous tools stand out at the top right. Bubble size is the number of calls. Dashed lines mark risk {RISK_T} and {ms(LAT_T)}.
        </p>
        <div className="flex flex-wrap gap-3">
          <Segmented
            value={kind}
            onChange={setKind}
            label="Kind"
            options={[
              { value: 'all', label: 'All' },
              { value: 'tool', label: 'Tools' },
              { value: 'llm', label: 'Models' },
            ]}
          />
          <Segmented value={days} onChange={setDays} options={RANGES} label="Period" />
        </div>
      </div>
      {error && <ErrorNote message={(error as Error).message} />}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tools.length === 0 ? (
        <Panel>
          <Empty title="No calls to plot yet" text="Each tool and model your agents call becomes a bubble, sized by volume." />
        </Panel>
      ) : (
        <>
          {hot.length > 0 && (
            <div role="status" className="rounded-lg border border-block/40 bg-block/10 px-4 py-3 text-[13.5px]">
              <span className="font-display text-block">{hot.length} slow and risky</span>
              <span className="text-paper">
                {' '}
                {hot.length === 1 ? 'tool is' : 'tools are'} good candidates for caching or mandatory approval:{' '}
                {hot.slice(0, 5).map((t, i) => (
                  <span key={t.tool}>
                    {i > 0 && ', '}
                    <button className="underline decoration-dotted underline-offset-2" onClick={() => open(t)}>
                      {t.tool}
                    </button>
                  </span>
                ))}
                .
              </span>
            </div>
          )}
          <Panel title="Risk against latency">
            <div className="px-2 pb-3">
              <Suspense fallback={<Skeleton className="m-2 h-[420px]" />}>
                <EChart
                  option={option}
                  height={420}
                  label="Scatter plot of average risk against average latency per tool"
                  onClick={(p) => open(p.data.stat)}
                />
              </Suspense>
            </div>
            <p className="px-4 pb-3 text-[12.5px] text-faint">
              Click a bubble to open its riskiest trace.
              {data?.sampled && ' Based on the 20,000 most recent calls of the period.'}
            </p>
          </Panel>

          <Panel title="All tools">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="text-[12.5px] text-faint">
                  <tr className="border-b border-line">
                    {['Tool', 'Kind', 'Calls', 'Avg latency', 'p95', 'Avg risk', 'Max risk', 'Blocked'].map((h) => (
                      <th key={h} className="px-4 py-2 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={`${t.kind}|${t.tool}`} className="cursor-pointer border-b border-line/60 hover:bg-slab" onClick={() => open(t)}>
                      <td className="px-4 py-2 text-paper">{t.tool}</td>
                      <td className="px-4 py-2 text-dim">{t.kind === 'llm' ? 'model' : t.kind}</td>
                      <td className="num px-4 py-2 text-dim">{t.calls.toLocaleString()}</td>
                      <td className="num px-4 py-2 text-dim">{ms(t.avg_latency_ms)}</td>
                      <td className="num px-4 py-2 text-dim">{ms(t.p95_latency_ms)}</td>
                      <td className="num px-4 py-2" style={{ color: t.avg_risk >= RISK_T ? 'var(--color-block)' : t.avg_risk >= 30 ? 'var(--color-amber)' : 'var(--color-dim)' }}>
                        {t.avg_risk}
                      </td>
                      <td className="num px-4 py-2 text-dim">{t.max_risk}</td>
                      <td className="num px-4 py-2" style={{ color: t.blocked ? 'var(--color-block)' : 'var(--color-faint)' }}>
                        {t.blocked}
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
