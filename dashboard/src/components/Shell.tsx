import { useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Activity, Bot, ExternalLink, LayoutDashboard, LogOut, Octagon, Route, Search, ShieldCheck } from 'lucide-react'
import { useApprovals, useMe, useTrail } from '../lib/queries'
import { CommandPalette } from './CommandPalette'
import { TraceDrawer } from './TraceDrawer'
import { useTicker } from './ui'

type Item = { to: string; path: string; search?: string; label: string; icon: ReactNode; badge?: number }

function useNav(): { group: string; items: Item[] }[] {
  const pending = useApprovals('pending').data?.counts.pending ?? 0
  return [
    {
      group: 'Observe',
      items: [
        { to: '/', path: '/', label: 'Overview', icon: <LayoutDashboard size={16} /> },
        { to: '/feed', path: '/feed', label: 'Live feed', icon: <Activity size={16} /> },
        { to: '/traces', path: '/traces', label: 'Traces', icon: <Route size={16} /> },
      ],
    },
    {
      group: 'Protect',
      items: [
        {
          to: '/feed?decision=blocked',
          path: '/feed',
          search: 'decision=blocked',
          label: 'Blocked actions',
          icon: <Octagon size={16} />,
        },
      ],
    },
    {
      group: 'Control',
      items: [
        { to: '/approvals', path: '/approvals', label: 'Approvals', icon: <ShieldCheck size={16} />, badge: pending },
        { to: '/agents', path: '/agents', label: 'Agents', icon: <Bot size={16} /> },
      ],
    },
  ]
}

function isActive(item: Item, pathname: string, search: string) {
  if (pathname !== item.path) return false
  if (item.search) return search.includes(item.search)
  return !(item.path === '/feed' && search.includes('decision=blocked'))
}

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/feed': 'Live feed',
  '/traces': 'Traces',
  '/approvals': 'Approvals',
  '/agents': 'Agents',
}

function LiveDot() {
  useTicker()
  const { dataUpdatedAt, isError } = useTrail()
  const age = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000) : null
  if (isError || (age !== null && age > 20)) {
    return (
      <span className="flex items-center gap-2 text-[13px] text-block">
        <span aria-hidden className="size-2 rounded-full bg-block" /> Connection lost
      </span>
    )
  }
  return (
    <span className="num flex items-center gap-2 text-[13px] text-dim">
      <span aria-hidden className="size-2 rounded-full bg-allow" />
      Live{age !== null ? ` · ${age}s ago` : ''}
    </span>
  )
}

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const onOpenPalette = () => setPaletteOpen(true)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      const t = e.target as HTMLElement | null
      const typing = !!t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const loc = useLocation()
  const nav = useNav()
  const { data: me } = useMe()
  const [menuOpen, setMenuOpen] = useState(false)
  const title = TITLES[loc.pathname] || 'Cerbere'
  const flat = nav.flatMap((g) => g.items)

  return (
    <div className="flex h-full">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-coal md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.svg" alt="" width={26} height={26} />
          <span className="font-display text-[18px] font-medium tracking-tight">Cerbere</span>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
          {nav.map((g) => (
            <div key={g.group}>
              <div className="px-2 pb-1 text-[12.5px] text-faint">{g.group}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it, loc.pathname, loc.search)
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] ${active ? 'bg-lift text-paper' : 'text-dim hover:bg-slab hover:text-paper'}`}
                      >
                        {active && <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded bg-amber" />}
                        {it.icon}
                        <span className="flex-1">{it.label}</span>
                        {!!it.badge && (
                          <span className="num rounded-full bg-amber px-1.5 text-[11.5px] font-medium text-ink">{it.badge}</span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line px-4 py-3 text-[13px]">
          <a href="/legacy" className="flex items-center gap-2 text-dim hover:text-paper">
            <ExternalLink size={14} /> Keys, budgets and policies
          </a>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-faint" title={me?.user?.email}>
              {me?.user?.email || 'Signed in'}
            </span>
            <a href="/logout" aria-label="Sign out" className="text-dim hover:text-paper">
              <LogOut size={15} />
            </a>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded p-1 text-dim"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <LayoutDashboard size={18} />
            </button>
            <h1 className="font-display text-[20px] font-medium">{title}</h1>
          </div>
          <div className="flex items-center gap-5">
            <LiveDot />
            <button
              onClick={onOpenPalette}
              className="flex items-center gap-2 rounded-md border border-line bg-coal px-3 py-1.5 text-[13px] text-dim hover:bg-slab hover:text-paper"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded border border-line px-1.5 font-mono text-[11.5px] text-faint">Ctrl K</kbd>
            </button>
          </div>
        </header>

        {menuOpen && (
          <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden" aria-label="Main (mobile)">
            {flat.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setMenuOpen(false)}
                className={`rounded-md px-3 py-1.5 text-[13px] whitespace-nowrap ${isActive(it, loc.pathname, loc.search) ? 'bg-lift text-paper' : 'text-dim'}`}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        )}

        <main className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      <TraceDrawer />
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  )
}
