import { lazy, Suspense, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useChecks, useCost, useExpensive, useLatency, useMetrics, useModels } from '../lib/queries'
import { ms, usd } from '../lib/format'
import { Empty, ErrorNote, Panel, Skeleton } from '../components/ui'

const EChart = lazy(() => import('../components/EChart'))
const AXIS = '#9a968e'
const GRID = '#2a2a2f'
const TIP = { backgroundColor: '#242428', borderColor: GRID, textStyle: { color: '#ece7dc' } }

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-coal p-4">
      <div className="text-[13px] text-dim">{label}</div>
      <div className="num mt-1 font-display text-[28px] leading-9">{value}</div>
      {note && <div className="mt-0.5 text-[12.5px] text-faint">{note}</div>}
    </div>
  )
}

export default function Performance() {
  const lat = useLatency()
  const models = useModels()
  const checks = useChecks()
  const cost = useCost()
  const metrics = useMetrics()
  const expensive = useExpensive()
  const [, setParams] = useSearchParams()

  const l = lat.data
  const has = !!l && l.count > 0
  const m = metrics.data
  const avgCost = m && m.total_spans ? m.total_cost_usd / m.total_spans : 0
  const modelRows = models.data || []
  const checkRows = checks.data || []
  const costRows = cost.data || []

  const modelOption = useMemo(
    () => ({
      grid: { left: 8, right: 16, top: 16, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', ...TIP },
      xAxis: { type: 'category', data: modelRows.map((x) => x.name || 'unknown'), axisLabel: { color: AXIS }, axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false } },
      yAxis: { type: 'value', name: 'ms', nameTextStyle: { color: AXIS }, axisLabel: { color: AXIS }, splitLine: { lineStyle: { color: GRID } } },
      series: [{ name: 'Average latency (ms)', type: 'bar', data: modelRows.map((x) => x.avg_latency_ms), itemStyle: { color: '#ece7dc' }, barMaxWidth: 36 }],
    }),
    [modelRows],
  )

  const checkOption = useMemo(
    () => ({
      grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...TIP },
      xAxis: { type: 'value', axisLabel: { color: AXIS }, splitLine: { lineStyle: { color: GRID } } },
      yAxis: { type: 'category', inverse: true, data: checkRows.map((c) => c.check_name), axisLabel: { color: AXIS }, axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false } },
      series: [
        { name: 'Passed', type: 'bar', stack: 's', data: checkRows.map((c) => c.total - c.flagged), itemStyle: { color: '#3a6b58' }, barMaxWidth: 22 },
        { name: 'Flagged', type: 'bar', stack: 's', data: checkRows.map((c) => c.flagged), itemStyle: { color: '#e9a23b' }, barMaxWidth: 22 },
      ],
    }),
    [checkRows],
  )

  const tokenOption = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', ...TIP },
      xAxis: { type: 'category', data: costRows.map((r) => r.day.slice(5)), axisLabel: { color: AXIS }, axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: AXIS }, splitLine: { lineStyle: { color: GRID } } },
      series: [{ name: 'Tokens', type: 'bar', data: costRows.map((r) => r.tokens), itemStyle: { color: '#8a8f98' }, barMaxWidth: 28 }],
    }),
    [costRows],
  )

  const openTrace = (id: string) =>
    setParams(
      (p) => {
        p.set('trace', id)
        p.delete('span')
        return p
      },
      { replace: true },
    )

  const chart = (loading: boolean, rows: unknown[], emptyTitle: string, emptyText: string, node: React.ReactNode) =>
    loading ? <Skeleton className="m-4 h-[220px]" /> : rows.length ? <div className="px-2 pb-3"><Suspense fallback={<Skeleton className="m-2 h-[220px]" />}>{node}</Suspense></div> : <Empty title={emptyTitle} text={emptyText} />

  return (
    <div className="space-y-5">
      {[lat.error, models.error, checks.error, expensive.error].filter(Boolean).map((e, i) => (
        <ErrorNote key={i} message={(e as Error).message} />
      ))}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Response time p50" value={has ? ms(l.p50) : '—'} note={has ? `${l.count.toLocaleString()} calls measured` : 'No calls yet'} />
        <Stat label="p90" value={has ? ms(l.p90) : '—'} />
        <Stat label="p95" value={has ? ms(l.p95) : '—'} />
        <Stat label="p99" value={has ? ms(l.p99) : '—'} note={has ? `slowest ${ms(l.max)}` : undefined} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Average cost per request" value={m ? usd(avgCost) : '—'} />
        <Stat label="Total cost" value={m ? usd(m.total_cost_usd) : '—'} />
        <div className="rounded-lg border border-line bg-coal p-4">
          <div className="text-[13px] text-dim">Cost or token alerts</div>
          <p className="mt-1 text-[13px] text-paper">Get notified when spend or usage crosses a threshold.</p>
          <Link to="/settings?tab=alerts" className="mt-2 inline-block text-[13px] text-amber hover:underline">
            Set an alert
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Response time per model">
          {chart(models.isLoading, modelRows, 'No model calls yet', 'Average latency appears per model after the first LLM calls.',
            <EChart option={modelOption} label="Average latency per model" height={220} />)}
        </Panel>
        <Panel title="Guardrail activation by type">
          {chart(checks.isLoading, checkRows, 'No guardrail checks yet', 'Each security check shows how often it flagged a call.',
            <EChart option={checkOption} label="Guardrail checks, passed and flagged" height={Math.max(180, checkRows.length * 34 + 24)} />)}
        </Panel>
      </div>

      <Panel title="Tokens per day">
        {chart(cost.isLoading, costRows, 'No usage yet', 'Daily token counts appear after the first calls.',
          <EChart option={tokenOption} label="Tokens used per day" height={200} />)}
      </Panel>

      <Panel title="Models">
        {modelRows.length === 0 ? (
          <Empty title="No models yet" text="Requests, cost and tokens are listed per model." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[12.5px] text-faint">
                <tr className="border-b border-line">
                  {['Model', 'Requests', 'Avg latency', 'Blocked', 'Tokens in / out', 'Cost'].map((h) => (
                    <th key={h} className="px-4 py-2 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelRows.map((x) => (
                  <tr key={x.name || 'unknown'} className="border-b border-line/60">
                    <td className="px-4 py-2 text-paper">{x.name || 'unknown'}</td>
                    <td className="num px-4 py-2 text-dim">{x.requests.toLocaleString()}</td>
                    <td className="num px-4 py-2 text-dim">{ms(x.avg_latency_ms)}</td>
                    <td className="num px-4 py-2" style={{ color: x.blocked_count ? 'var(--color-block)' : 'var(--color-faint)' }}>{x.blocked_count || 0}</td>
                    <td className="num px-4 py-2 text-dim">{x.input_tokens.toLocaleString()} / {x.output_tokens.toLocaleString()}</td>
                    <td className="num px-4 py-2 text-dim">{usd(x.total_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Most expensive prompts">
        {expensive.isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : (expensive.data || []).length === 0 ? (
          <Empty title="No costly prompts yet" text="The ten calls that cost the most are listed here with their trace." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[12.5px] text-faint">
                <tr className="border-b border-line">
                  {['Prompt', 'Model', 'Tokens', 'Cost'].map((h) => (
                    <th key={h} className="px-4 py-2 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(expensive.data || []).slice(0, 10).map((x) => (
                  <tr key={`${x.trace_id}|${x.span_id}`} className="cursor-pointer border-b border-line/60 hover:bg-slab" onClick={() => openTrace(x.trace_id)}>
                    <td className="max-w-[420px] truncate px-4 py-2 text-paper">{x.prompt || '—'}</td>
                    <td className="px-4 py-2 text-dim">{x.model || '—'}</td>
                    <td className="num px-4 py-2 text-dim">{(x.input_tokens + x.output_tokens).toLocaleString()}</td>
                    <td className="num px-4 py-2 text-dim">{usd(x.cost_usd)}</td>
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
