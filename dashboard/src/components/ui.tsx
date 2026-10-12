import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
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

/* ---------- formulaires ---------- */

const CONTROL = 'w-full rounded-md border border-line bg-ink px-3 py-1.5 text-[13px] text-paper placeholder:text-faint disabled:opacity-50'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] text-dim">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${props.className ?? ''}`} />
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) {
  return (
    <select {...props} className={`${CONTROL} ${props.className ?? ''}`}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <option key={v} value={v}>
            {l}
          </option>
        )
      })}
    </select>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex w-fit gap-1 rounded-md border border-line bg-coal p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-[13px] ${value === o.value ? 'bg-lift text-paper' : 'text-dim hover:text-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ pct, color = 'var(--color-allow)' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slab" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  )
}

/** Confirmation en deux clics : le premier arme le bouton, le second exécute. */
export function useArm(timeoutMs = 4000) {
  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(null), timeoutMs)
    return () => window.clearTimeout(t)
  }, [armed, timeoutMs])
  return { armed, arm: setArmed, reset: () => setArmed(null) }
}
