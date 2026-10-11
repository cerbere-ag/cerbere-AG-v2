import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TRAIL_LIMIT, useApprovals, useCost, useDaily, useHeatmap, useMetrics, useSummary, useTrail } from '../lib/queries'
import type { AuditEvent, CostRow, DailyRow } from '../lib/api'
import { ago, pct, usd } from '../lib/format'
import { Kpi } from '../components/Kpi'
import { FeedTable } from '../components/FeedTable'
import { Empty, ErrorNote, Panel, Skeleton } from '../components/ui'

const EChart = lazy(() => import('../components/EChart'))

const AXIS = '#9a968e'
const GRID = '#2a2a2f'

function perMinute(events: AuditEvent[], minutes = 30) {
  const now = Date.now()
  const buckets = Array<number>(minutes).fill(0)
  for (const e of events) {
    const age = Math.floor((now - Date.parse(e.timestamp)) / 60000)
    if (age >= 0 && age < minutes) buckets[minutes - 1 - age]++
  }
  // la liste est tronquée : on ne montre pas de minutes que l'on n'a pas vues
  if (events.length >= TRAIL_LIMIT && events.length) {
    const oldest = Math.min(...events.map((e) => Date.parse(e.timestamp)))
    const covered = Math.max(1, Math.ceil((now - oldest) / 60000))
    return buckets.slice(-Math.min(minutes, covered))
  }
  return buckets
}

function costFigures(rows: CostRow[]) {
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const todayCost = rows.find((r) => r.day === today)?.cost ?? 0
  const mtd = rows.filter((r) => r.day.startsWith(month)).reduce((a, r) => a + r.cost, 0)
  const recent = rows.slice(-7)
  const avg = recent.length ? recent.reduce((a, r) => a + r.cost, 0) / recent.length : 0
  const now = new Date()
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate()
  const remaining = Math.max(0, daysInMonth - now.getUTCDate())
  return { todayCost, mtd, projected: mtd + avg * remaining, spark: rows.slice(-14).map((r) => r.cost) }
}

function rate(r?: DailyRow) {
  return r && r.total ? (r.blocked / r.total) * 100 : 0
}

export default function Overview() {
  const trail = useTrail()
  const summary = useSummary()
  const daily = useDaily()
  const cost = useCost()
  const approvals = useApprovals('pending')
  const metrics = useMetrics()
  const heat = useHeatmap(91)

  const events = trail.data || []
  const buckets = useMemo(() => perMinute(events), [events])
  const last5 = buckets.slice(-5)
  const perMin = last5.length ? last5.reduce((a, b) => a + b, 0) / last5.length : 0

  const dailyRows = daily.data || []
  const lastDay = dailyRows[dailyRows.length - 1]
  const prevDay = dailyRows[dailyRows.length - 2]
  const delta = lastDay && prevDay ? rate(lastDay) - rate(prevDay) : null

  const c = useMemo(() => costFigures(cost.data || []), [cost.data])

  const pending = approvals.data?.counts.pending ?? 0
  const oldest = approvals.data?.approvals[0]?.created_at

  const dailyOption = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: '#242428', borderColor: GRID, textStyle: { color: '#ece7dc' } },
      xAxis: {
        type: 'category',
        data: dailyRows.map((d) => d.day.slice(5)),
        axisLine: { lineStyle: { color: GRID } },
        axisLabel: { color: AXIS },
        axisTick: { show: false },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
      series: [
        { name: 'Allowed or flagged', type: 'bar', stack: 'a', data: dailyRows.map((d) => d.total - d.blocked), itemStyle: { color: '#3a6b58' } },
        { name: 'Blocked', type: 'bar', stack: 'a', data: dailyRows.map((d) => d.blocked), itemStyle: { color: '#e2594f' } },
      ],
    }),
    [dailyRows],
  )

  const heatOption = useMemo(() => {
    const cells = heat.data?.cells || []
    const end = new Date()
    const start = new Date(end.getTime() - 90 * 86400000)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const max = Math.max(1, ...cells.map((x) => x.blocked))
    const byDate = new Map(cells.map((x) => [x.date, x]))
    return {
      tooltip: {
        backgroundColor: '#242428',
        borderColor: GRID,
        textStyle: { color: '#ece7dc' },
        formatter: (p: { value: [string, number] }) => {
          const x = byDate.get(p.value[0])
          return x ? `${p.value[0]}<br/>${x.total} actions · ${x.blocked} blocked · ${x.flagged} flagged` : p.value[0]
        },
      },
      visualMap: { min: 0, max, show: false, inRange: { color: ['#1b1b1e', '#5b2a26', '#e2594f'] } },
      calendar: {
        range: [fmt(start), fmt(end)],
        top: 24,
        left: 30,
        right: 8,
        cellSize: ['auto', 15],
        itemStyle: { borderWidth: 3, borderColor: '#131315', color: '#1b1b1e' },
        splitLine: { show: false },
        yearLabel: { show: false },
        dayLabel: { color: AXIS, firstDay: 1, nameMap: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] },
        monthLabel: { color: AXIS },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: cells.map((x) => [x.date, x.blocked]) }],
    }
  }, [heat.data])

  const loading = trail.isLoading
  const threats = metrics.data?.top_threats || []

  return (
    <div className="space-y-5">
      {trail.error && <ErrorNote message={(trail.error as Error).message} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Decisions per minute"
          value={perMin.toFixed(1)}
          note="Average over the last 5 minutes"
          spark={buckets}
          loading={loading}
        />
        <Kpi
          label="Blocked rate, 14 days"
          value={summary.data && summary.data.total ? pct((summary.data.blocked / summary.data.total) * 100) : '0%'}
          note={
            summary.data
              ? `${summary.data.blocked.toLocaleString()} of ${summary.data.total.toLocaleString()} actions${delta !== null ? ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts vs previous day` : ''}`
              : undefined
          }
          spark={dailyRows.map(rate)}
          color="var(--color-block)"
          loading={summary.isLoading}
        />
        <Kpi
          label="LLM cost today"
          value={usd(c.todayCost)}
          note={`Month to date ${usd(c.mtd)} · projected ${usd(c.projected)}`}
          spark={c.spark}
          loading={cost.isLoading}
        />
        <Kpi
          label="Waiting for approval"
          value={pending}
          note={pending ? `Oldest waiting ${ago(oldest)}` : 'Nothing is waiting'}
          color={pending ? 'var(--color-amber)' : undefined}
          to="/approvals"
          loading={approvals.isLoading}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel
          title="Latest decisions"
          action={
            <Link to="/feed" className="text-[13px] text-dim hover:text-paper">
              Open live feed
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Empty
              title="No decisions yet"
              text="Connect an agent with your API key and each action it attempts shows up here, with the decision Cerbere made."
              action={
                <a href="/legacy" className="text-[13px] text-amber hover:underline">
                  Get your API key
                </a>
              }
            />
          ) : (
            <FeedTable events={events.slice(0, 10)} compact />
          )}
        </Panel>

        <Panel title="Top threats">
          {threats.length === 0 ? (
            <Empty title="No threats recorded" text="Blocked reasons appear here, most frequent first." />
          ) : (
            <ul className="px-4 pb-4">
              {threats.slice(0, 6).map((t) => (
                <li key={t.reason} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-[13px] last:border-0">
                  <span className="truncate text-paper">{t.reason}</span>
                  <span className="num text-block">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Actions per day">
          <div className="px-2 pb-3">
            <Suspense fallback={<Skeleton className="m-2 h-[220px]" />}>
              {dailyRows.length ? (
                <EChart option={dailyOption} label="Actions per day, allowed and blocked" height={220} />
              ) : (
                <Empty title="No data yet" text="Daily totals appear after the first actions." />
              )}
            </Suspense>
          </div>
        </Panel>
        <Panel title="Blocked actions, last 13 weeks">
          <div className="px-2 pb-3">
            <Suspense fallback={<Skeleton className="m-2 h-[220px]" />}>
              <EChart option={heatOption} label="Calendar heatmap of blocked actions per day" height={220} />
            </Suspense>
          </div>
        </Panel>
      </div>
    </div>
  )
}
