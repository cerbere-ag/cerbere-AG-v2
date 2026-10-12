/** Le collector renvoie parfois « 2026-10-10 23:17:17 » (UTC sans fuseau) : on force l'UTC. */
export function parseTs(iso?: string | null): number {
  if (!iso) return NaN
  const s = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(iso) ? `${iso.replace(' ', 'T')}Z` : iso
  return Date.parse(s)
}

export function ago(iso?: string | null): string {
  if (!iso) return '—'
  const t = parseTs(iso)
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

export function clock(iso?: string | null): string {
  if (!iso) return '—'
  const t = parseTs(iso)
  if (Number.isNaN(t)) return '—'
  const d = new Date(t)
  return d.toLocaleTimeString([], { hour12: false })
}

export function usd(n?: number | null): string {
  const v = n ?? 0
  if (v === 0) return '$0.00'
  if (Math.abs(v) < 0.01) return `$${v.toFixed(4)}`
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ms(n?: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(2)} s`
  return `${Math.round(n)} ms`
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function shortId(id: string, n = 8): string {
  return id.length > n ? id.slice(0, n) : id
}

export function pretty(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

/** Début d'un span en secondes epoch (timestamp SDK, sinon created_at). */
export function spanStart(s: { timestamp: number | null; created_at: string | null }): number {
  if (typeof s.timestamp === 'number' && s.timestamp > 0) {
    return s.timestamp > 1e12 ? s.timestamp / 1000 : s.timestamp
  }
  const t = s.created_at ? parseTs(s.created_at) : NaN
  return Number.isNaN(t) ? 0 : t / 1000
}
