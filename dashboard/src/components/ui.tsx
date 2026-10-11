import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Decision, Risk } from '../lib/api'

/* ---------- décision : couleur + forme (lisible sans la couleur) ---------- */

export const DECISION_META: Record<Decision, { label: string; color: string }> = {
  allowed: { label: 'Allowed', color: 'var(--color-allow)' },
  flagged: { label: 'Flagged', color: 'var(--color-amber)' },
  blocked: { label: 'Blocked', color: 'var(--color-block)' },
}

function Shape({ decision, size = 8 }: { decision: Decision; size?: number }) {
  const color = DECISION_META[decision].color
  const base = { width: size, height: size, background: color, display: 'inline-block', flexShrink: 0 } as const
  if (decision === 'allowed') return <span aria-hidden style={{ ...base, borderRadius: '50%' }} />
  if (decision === 'flagged') return <span aria-hidden style={{ ...base, transform: 'rotate(45deg)' }} />
  return <span aria-hidden style={{ ...base, borderRadius: 1 }} />
}

export function DecisionBadge({ decision }: { decision: Decision }) {
  const m = DECISION_META[decision]
  return (
    <span className="inline-flex items-center gap-2 text-[13px]" style={{ color: m.color }}>
      <Shape decision={decision} />
      {m.label}
    </span>
  )
}

export const RISK_COLOR: Record<Risk, string> = {
  low: 'var(--color-faint)',
  medium: 'var(--color-dim)',
  high: 'var(--color-amber)',
  critical: 'var(--color-block)',
}

export function RiskTag({ risk }: { risk: Risk }) {
  return (
    <span className="text-[13px]" style={{ color: RISK_COLOR[risk] }}>
      {risk}
    </span>
  )
}

/* ---------- surfaces ---------- */

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-line bg-coal ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          {title && <h2 className="font-display text-[15px] font-medium text-paper">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 px-5 py-10">
      <p className="font-display text-base text-paper">{title}</p>
      <p className="max-w-md text-dim">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slab ${className}`} />
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-block/40 bg-block/10 px-3 py-2 text-[13px] text-block">
      {message}
    </div>
  )
}

/* ---------- boutons ---------- */

type Variant = 'primary' | 'ghost' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-amber text-ink hover:brightness-110',
  ghost: 'border border-line text-paper hover:bg-lift',
  danger: 'border border-block/50 text-block hover:bg-block/10',
}

export function Button({
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  )
}

/* ---------- toasts ---------- */

type Toast = { id: number; text: string; tone: 'ok' | 'error' }
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, text, tone }])
    window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md border border-line bg-lift px-4 py-2 text-[13px] shadow-lg"
            style={{ color: t.tone === 'error' ? 'var(--color-block)' : 'var(--color-paper)' }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* re-render léger chaque seconde pour les « il y a X s » */
export function useTicker(intervalMs = 1000) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}
