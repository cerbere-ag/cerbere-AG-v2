import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, GraphChart, HeatmapChart, SankeyChart, ScatterChart } from 'echarts/charts'
import { CalendarComponent, GridComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  GraphChart,
  HeatmapChart,
  SankeyChart,
  ScatterChart,
  CalendarComponent,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

export default function EChart({
  option,
  height = 220,
  label,
  onClick,
}: {
  option: echarts.EChartsCoreOption
  height?: number
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (params: any) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    if (!ref.current) return
    const c = echarts.init(ref.current)
    chart.current = c
    c.on('click', (p) => onClickRef.current?.(p))
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    chart.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} role="img" aria-label={label} style={{ height, width: '100%' }} />
}
