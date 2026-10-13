import { useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, BookOpen, Bot, Crosshair, FileCheck2, Gauge, LayoutDashboard, LifeBuoy, Network, Octagon, Route, Scale, Settings, ShieldCheck, Workflow } from 'lucide-react'
import { useAgents, useApprovals, useTraces } from '../lib/queries'
import { ago, shortId } from '../lib/format'

export function CommandPalette({
  open,
  setOpen,
  onDocs,
  onSupport,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  onDocs: () => void
  onSupport: () => void
}) {
  const navigate = useNavigate()
  const [, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const traces = useTraces().data || []
  const agents = useAgents().data?.agents || []
  const pending = useApprovals('pending').data?.counts.pending ?? 0

  const go = (to: string) => {
    setOpen(false)
    setQuery('')
    navigate(to)
  }
  const openTrace = (id: string) => {
    setOpen(false)
    setQuery('')
    setParams(
      (p) => {
        p.set('trace', id)
        p.delete('span')
        return p
      },
      { replace: true },
    )
  }

  const typed = query.trim()
  const looksLikeId = typed.length >= 6 && /^[\w-]+$/.test(typed)

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Search Cerbere" shouldFilter>
      <Command.Input value={query} onValueChange={setQuery} placeholder="Search a trace, an agent or a page" />
      <Command.List>
        <Command.Empty>Nothing matches. Paste a trace id to open it.</Command.Empty>

        <Command.Group heading="Go to">
          <Command.Item value="overview" onSelect={() => go('/')}>
            <LayoutDashboard size={15} /> Overview
          </Command.Item>
          <Command.Item value="live feed decisions" onSelect={() => go('/feed')}>
            <Activity size={15} /> Live feed
          </Command.Item>
          <Command.Item value="blocked actions" onSelect={() => go('/feed?decision=blocked')}>
            <Octagon size={15} /> Blocked actions
          </Command.Item>
          <Command.Item value="traces" onSelect={() => go('/traces')}>
            <Route size={15} /> Traces
          </Command.Item>
          <Command.Item value="approvals pending inbox" onSelect={() => go('/approvals')}>
            <ShieldCheck size={15} /> Approvals{pending ? ` · ${pending} waiting` : ''}
          </Command.Item>
          <Command.Item value="agents kill switch disconnect" onSelect={() => go('/agents')}>
            <Bot size={15} /> Agents
          </Command.Item>
          <Command.Item value="performance latency cost tokens models" onSelect={() => go('/performance')}>
            <Gauge size={15} /> Performance
          </Command.Item>
          <Command.Item value="data flow sankey taint" onSelect={() => go('/flow')}>
            <Workflow size={15} /> Data flow
          </Command.Item>
          <Command.Item value="agent graph tools relations" onSelect={() => go('/graph')}>
            <Network size={15} /> Agent graph
          </Command.Item>
          <Command.Item value="risk vs latency scatter slow dangerous tools" onSelect={() => go('/risk')}>
            <Crosshair size={15} /> Risk vs latency
          </Command.Item>
          <Command.Item value="compliance audit export verify" onSelect={() => go('/compliance')}>
            <FileCheck2 size={15} /> Compliance
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Help">
          <Command.Item value="documentation docs help guide" onSelect={() => { setOpen(false); onDocs() }}>
            <BookOpen size={15} /> Documentation
          </Command.Item>
          <Command.Item value="support contact help email" onSelect={() => { setOpen(false); onSupport() }}>
            <LifeBuoy size={15} /> Contact support
          </Command.Item>
          <Command.Item value="legal terms privacy" onSelect={() => { setOpen(false); window.open('/legal', '_blank', 'noopener,noreferrer') }}>
            <Scale size={15} /> Legal documents
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Settings">
          {[
            ['keys', 'API keys'],
            ['connect', 'Integrations and snippets'],
            ['budgets', 'Budgets'],
            ['policies', 'Policies'],
            ['alerts', 'Alerts and destinations'],
          ].map(([tab, name]) => (
            <Command.Item key={tab} value={`settings ${name}`} onSelect={() => go(`/settings?tab=${tab}`)}>
              <Settings size={15} /> {name}
            </Command.Item>
          ))}
        </Command.Group>

        {looksLikeId && (
          <Command.Group heading="Open">
            <Command.Item forceMount value={`open-${typed}`} onSelect={() => openTrace(typed)}>
              <Route size={15} /> Open trace {typed}
            </Command.Item>
          </Command.Group>
        )}

        {traces.length > 0 && (
          <Command.Group heading="Recent traces">
            {traces.slice(0, 8).map((t) => (
              <Command.Item key={t.trace_id} value={`trace ${t.trace_id}`} onSelect={() => openTrace(t.trace_id)}>
                <Route size={15} />
                <span className="font-mono text-[12.5px]">{shortId(t.trace_id, 12)}</span>
                <span className="ml-auto text-faint">
                  {t.span_count} spans{t.blocked_count ? ` · ${t.blocked_count} blocked` : ''} · {ago(t.last_seen)}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {agents.length > 0 && (
          <Command.Group heading="Agents">
            {agents.slice(0, 8).map((a) => (
              <Command.Item key={a.agent_id} value={`agent ${a.name} ${a.agent_id}`} onSelect={() => go('/agents')}>
                <Bot size={15} /> {a.name}
                <span className="ml-auto text-faint">{a.state}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
