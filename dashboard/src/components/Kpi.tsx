import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from './ui'
import { Sparkline } from './Sparkline'

export function Kpi({
  label,
  value,
  note,
  spark,
  color,
  to,
  loading,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  spark?: number[]
  color?: string
  to?: string
  loading?: boolean
}) {
  const body = (
    <>
      <div className="text-[13px] text-dim">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <div className="num mt-1 font-display text-[30px] leading-9 font-medium" style={{ color: color || 'var(--color-paper)' }}>
          {value}
        </div>
      )}
      <div className="mt-1 min-h-5 text-[12.5px] text-faint">{note}</div>
      {spark && spark.length > 1 && (
        <div className="mt-2" style={{ color: color || 'var(--color-dim)' }}>
          <Sparkline values={spark} />
        </div>
      )}
    </>
  )
  const cls = 'block rounded-lg border border-line bg-coal p-4'
  return to ? (
    <Link to={to} className={`${cls} transition-colors hover:bg-slab`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
