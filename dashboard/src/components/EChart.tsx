import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart } from 'echarts/charts'
import { CalendarComponent, GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, HeatmapChart, CalendarComponent, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

export default function EChart({
  option,
  height = 220,
  label,
}: {
  option: echarts.EChartsCoreOption
  height?: number
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const c = echarts.init(ref.current)
    chart.current = c
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
