import { useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Bot,
  Crosshair,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Network,
  Octagon,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import { useApprovals, useMe, useTrail } from '../lib/queries'
import { CommandPalette } from './CommandPalette'
import { DocsDialog, SupportDialog } from './HelpDialogs'
import { TraceDrawer } from './TraceDrawer'
import { LEGAL_URL } from '../lib/links'
import { useTicker } from './ui'

type Item = { to: string; path: string; search?: string; label: string; icon: ReactNode; badge?: number }

function useNav(): { group: string; items: Item[] }[] {
  const pending = useApprovals('pending').data?.counts.pending ?? 0
  return [
    {
      group: 'Observe',
      items: [
        { to: '/', path: '/', label: 'Overview', icon: <LayoutDashboard size={16} /> },
        { to: '/performance', path: '/performance', label: 'Performance', icon: <Gauge size={16} /> },
        { to: '/feed', path: '/feed', label: 'Live feed', icon: <Activity size={16} /> },
        { to: '/traces', path: '/traces', label: 'Traces', icon: <Route size={16} /> },
      ],
    },
    {
      group: 'Protect',
      items: [
        { to: '/flow', path: '/flow', label: 'Data flow', icon: <Workflow size={16} /> },
        { to: '/graph', path: '/graph', label: 'Agent graph', icon: <Network size={16} /> },
        { to: '/risk', path: '/risk', label: 'Risk vs latency', icon: <Crosshair size={16} /> },
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
        { to: '/compliance', path: '/compliance', label: 'Compliance', icon: <FileCheck2 size={16} /> },
        { to: '/settings', path: '/settings', label: 'Settings', icon: <Settings size={16} /> },
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
  '/performance': 'Performance',
  '/flow': 'Data flow',
  '/graph': 'Agent graph',
  '/risk': 'Risk vs latency',
  '/compliance': 'Compliance',
  '/settings': 'Settings',
}

const COLLAPSE_KEY = 'cerbere.sidebar.collapsed'
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
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
  const [docsOpen, setDocsOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      } catch {
        /* stockage indisponible : l'état reste en mémoire */
      }
      return !v
    })
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !typing) {
        e.preventDefault()
        toggleCollapsed()
        return
      }
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
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-coal transition-[width] duration-150 md:flex ${collapsed ? 'w-[64px]' : 'w-[232px]'}`}
      >
        <div className={`flex items-center py-4 ${collapsed ? 'flex-col gap-3 px-0' : 'justify-between px-5'}`}>
          <Link to="/" className="flex items-center gap-2.5" aria-label="Cerbere overview">
            <img src="/logo.svg" alt="" width={26} height={26} />
            {!collapsed && <span className="font-display text-[18px] font-medium tracking-tight">Cerbere</span>}
          </Link>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl B)`}
            className="rounded p-1 text-dim hover:bg-lift hover:text-paper"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Main">
          {nav.map((g, gi) => (
            <div key={g.group}>
              {collapsed ? (
                gi > 0 && <div aria-hidden className="mx-2 mb-3 border-t border-line" />
              ) : (
                <div className="px-2 pb-1 text-[12.5px] text-faint">{g.group}</div>
              )}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it, loc.pathname, loc.search)
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        title={collapsed ? it.label : undefined}
                        aria-label={collapsed ? it.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex items-center rounded-md py-1.5 text-[13.5px] ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'} ${active ? 'bg-lift text-paper' : 'text-dim hover:bg-slab hover:text-paper'}`}
                      >
                        {active && <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded bg-amber" />}
                        {it.icon}
                        {!collapsed && <span className="flex-1">{it.label}</span>}
                        {!!it.badge &&
                          (collapsed ? (
                            <span className="num absolute -top-0.5 right-1 min-w-4 rounded-full bg-amber px-1 text-center text-[10.5px] leading-4 font-medium text-ink">
                              {it.badge}
                            </span>
                          ) : (
                            <span className="num rounded-full bg-amber px-1.5 text-[11.5px] font-medium text-ink">{it.badge}</span>
                          ))}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className={`space-y-2 border-t border-line py-3 text-[13px] ${collapsed ? 'flex flex-col items-center px-0' : 'px-4'}`}>
          <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center gap-4'}`}>
            <button onClick={() => setDocsOpen(true)} title="Documentation" aria-label="Documentation" className="flex items-center gap-1.5 text-dim hover:text-paper">
              <BookOpen size={14} />
              {!collapsed && 'Docs'}
            </button>
            <button onClick={() => setSupportOpen(true)} title="Contact support" aria-label="Contact support" className="flex items-center gap-1.5 text-dim hover:text-paper">
              <LifeBuoy size={14} />
              {!collapsed && 'Support'}
            </button>
            <a href={LEGAL_URL} target="_blank" rel="noopener noreferrer" title="Legal" aria-label="Legal" className="flex items-center gap-1.5 text-dim hover:text-paper">
              <Scale size={14} />
              {!collapsed && 'Legal'}
            </a>
          </div>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
            {!collapsed && (
              <span className="truncate text-faint" title={me?.user?.email}>
                {me?.user?.email || 'Signed in'}
              </span>
            )}
            <a href="/logout" aria-label="Sign out" title="Sign out" className="text-dim hover:text-paper">
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
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} onDocs={() => setDocsOpen(true)} onSupport={() => setSupportOpen(true)} />
      <DocsDialog open={docsOpen} onClose={() => setDocsOpen(false)} />
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
