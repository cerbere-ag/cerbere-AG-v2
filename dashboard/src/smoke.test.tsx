import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { INTEGRATIONS } from './lib/integrations'

vi.mock('./components/EChart', () => ({ default: () => <div data-testid="chart" /> }))

const now = Date.now() / 1000
const iso = (offset: number) => new Date((now - offset) * 1000).toISOString()

const events = [
  { event_id: 'sp-3', timestamp: iso(2), agent: 'support-bot', provider: null, event_type: 'tool_call', model: null, tool: 'http_post', risk: 'high', detection: 'taint', decision: 'blocked', policy: 'PII exfiltration', trace_id: 'trace-1', span_id: 'sp-3', prompt: 'http_post' },
  { event_id: 'sp-2', timestamp: iso(30), agent: 'support-bot', provider: 'openai', event_type: 'llm_call', model: 'gpt-4o', tool: null, risk: 'medium', detection: 'regex', decision: 'flagged', policy: null, trace_id: 'trace-1', span_id: 'sp-2', prompt: 'x' },
  { event_id: 'sp-1', timestamp: iso(90), agent: 'support-bot', provider: null, event_type: 'tool_call', model: null, tool: 'read_file', risk: 'low', detection: null, decision: 'allowed', policy: null, trace_id: 'trace-1', span_id: 'sp-1', prompt: 'read_file' },
]
const span = (i: number, extra: object) => ({
  span_id: `sp-${i}`, trace_id: 'trace-1', span_type: 'tool_call', timestamp: now - 5 + i * 0.6, latency_ms: 300,
  input_data: { tool: 'read_file' }, output_data: { ok: true }, security_checks: [], blocked: false, block_reason: null,
  cost_usd: 0.002, input_tokens: 10, output_tokens: 5, created_at: '2026-10-10 23:17:17', detection_layer: null,
  ml_score: null, llm_score: null, llm_reason: null, model: null, ...extra,
})
const posts: Record<string, unknown> = {
  '/api/keys': { status: 'success', key: 'ag_live_SECRET_ONCE_123', key_id: 'k2', name: 'ci' },
}
const routes: Record<string, unknown> = {
  '/api/latency/distribution': { count: 40, p50: 120, p90: 480, p95: 900, p99: 2100, min: 5, max: 3000 },
  '/api/models': [{ name: 'gpt-4o', requests: 30, avg_latency_ms: 410, total_cost_usd: 0.4, blocked_count: 1, input_tokens: 1000, output_tokens: 500 }],
  '/api/checks/breakdown': [{ check_name: 'pii', total: 30, flagged: 4, flag_rate: 13.3 }],
  '/api/spans/expensive': [{ trace_id: 'trace-1', span_id: 'sp-1', span_type: 'llm_call', model: 'gpt-4o', cost_usd: 0.12, prompt: 'Summarize the quarterly report', response: 'ok', input_tokens: 900, output_tokens: 300 }],
  '/api/insights/flow': { days: 14, links: [{ source: 'SECRET', target: 'http_post', value: 4, blocked: 3 }, { source: 'CONFIDENTIAL', target: 'read_file', value: 6, blocked: 0 }], sources: ['CONFIDENTIAL', 'SECRET'], targets: ['http_post', 'read_file'], total: 10 },
  '/api/insights/graph': { days: 14, nodes: [{ id: 'agent:support-bot', kind: 'agent', label: 'support-bot', calls: 10, blocked: 3, risk: 40 }, { id: 'tool:http_post', kind: 'tool', label: 'http_post', calls: 4, blocked: 3, risk: 80 }, { id: 'data:SECRET', kind: 'data', label: 'SECRET', calls: 4, blocked: 3, risk: 85 }], edges: [{ source: 'agent:support-bot', target: 'tool:http_post', calls: 4, blocked: 3, risk: 80 }, { source: 'data:SECRET', target: 'tool:http_post', calls: 4, blocked: 3, risk: 85 }] },
  '/api/insights/tools': { days: 14, sampled: false, tools: [{ tool: 'http_post', kind: 'tool', calls: 4, avg_latency_ms: 800, p95_latency_ms: 900, avg_risk: 80, max_risk: 95, blocked: 3, trace_id: 'trace-1' }, { tool: 'read_file', kind: 'tool', calls: 6, avg_latency_ms: 90, p95_latency_ms: 120, avg_risk: 10, max_risk: 20, blocked: 0, trace_id: 'trace-1' }] },
  '/api/keys': { keys: [{ id: 'k1', name: 'production', active: true, created_at: '2026-10-01T10:00:00Z', key_preview: 'ag_live_...a1b2' }] },
  '/api/budgets': { budgets: [{ agent_id: 'support-bot', configured: true, max_budget_usd: 10, period: 'daily', action_on_exceed: 'block', spent_usd: 12, pct: 100, exceeded: true }], total: 1 },
  '/api/policy-rules': { rules: [{ id: 'r1', agent_scope: 'all', event_type: 'tool_call', tool_name: 'http_post', detection_type: 'pii_detection', operator: '>', threshold: '0.8', action: 'block', enabled: true, created_by: 'me', created_at: null }], total: 1 },
  '/api/alert-rules': { alert_rules: [{ id: 'a1', metric: 'cost_usd', comparison: 'above', threshold: 5, label: 'Daily spend', active: true }], count: 1 },
  '/api/alert-destinations': { destinations: [{ id: 'd1', type: 'slack', url: 'https://hooks.slack.com/…xyz', levels: ['critical', 'high'], created_at: null }], total: 1 },
  '/api/audit/verify': { valid: true, report: {}, verified_at: '2026-10-11T10:00:00' },
  '/api/auth/me': { authenticated: true, type: 'human', user: { email: 'chris@example.com', display_name: null, role: 'admin', org_id: 'o' } },
  '/api/audit/trail': events,
  '/api/audit/summary': { total: 3, blocked: 1, flagged: 1, allowed: 1, high_risk: 1, critical: 0, require_approval: 0, affected_agents: 1 },
  '/api/metrics': { total_spans: 3, blocked_operations: 1, total_cost_usd: 0.01, top_threats: [{ reason: 'PII exfiltration', count: 1 }], detection_layers: {} },
  '/api/trend/daily': [{ day: '2026-10-09', total: 10, blocked: 1 }, { day: '2026-10-10', total: 3, blocked: 1 }],
  '/api/cost/trend': [{ day: new Date().toISOString().slice(0, 10), cost: 0.01, tokens: 100 }],
  '/api/heatmap': { days: 91, cells: [{ date: '2026-10-10', total: 3, blocked: 1, flagged: 1 }] },
  '/api/traces': [{ trace_id: 'trace-1', span_count: 3, blocked_count: 1, total_cost: 0.006, last_seen: '2026-10-10 23:17:17', detection_layers: 'regex' }],
  '/api/traces/trace-1': [span(0, {}), span(1, { span_type: 'llm_call', model: 'gpt-4o', input_data: { prompt: 'hi' }, security_checks: [{ check_name: 'pii', passed: false, risk_level: 'high', details: 'email found' }] }), span(2, { input_data: { tool: 'http_post' }, blocked: true, block_reason: 'PII exfiltration' })],
  '/api/agents': { agents: [{ agent_id: 'support-bot', name: 'support-bot', status: 'connected', state: 'connected', sdk_version: '0.6.0', first_seen_at: iso(1000), last_seen_at: iso(3), disconnected_at: null, disconnected_by: null, calls: 12, blocked: 1, cost_usd: 0.02, pending_approvals: 1 }], counts: { connected: 1, idle: 0, offline: 0, disconnected: 0 }, total: 1 },
  '/api/approvals': { approvals: [{ id: 'ap-1', agent_id: 'support-bot', tool_name: 'send_email', params: { to: 'x@y.z' }, reason: 'External recipient', created_at: iso(120), status: 'pending', resolved_at: null, resolved_by: null }], count: 1, counts: { pending: 1, approved: 0, rejected: 0 } },
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const path = String(url).split('?')[0]
    const body = init?.method === 'POST' ? (posts[path] ?? { ok: true }) : init?.method === 'DELETE' || init?.method === 'PUT' || init?.method === 'PATCH' ? { ok: true } : routes[path]
    if (body === undefined) return new Response(JSON.stringify({ error: 'nf' }), { status: 404 })
    return new Response(JSON.stringify(body), { status: 200 })
  }))
})
afterEach(() => cleanup())

const go = (hash: string) => { window.location.hash = hash; return render(<App />) }
let errors: unknown[] = []
const orig = console.error
beforeAll(() => { console.error = (...a: unknown[]) => { errors.push(a); orig(...a) } })

describe('dashboard smoke', () => {
  it('overview shows KPIs, feed and threats', async () => {
    go('#/')
    expect(await screen.findByText('Decisions per minute')).toBeTruthy()
    expect(await screen.findByText('Latest decisions')).toBeTruthy()
    expect((await screen.findAllByText('PII exfiltration')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Waiting for approval')).toBeTruthy()
  })
  it('feed filters by decision', async () => {
    go('#/feed')
    await screen.findByText('read_file')
    fireEvent.click(screen.getByRole('button', { name: /^Blocked\s*\d/ }))
    await waitFor(() => expect(screen.queryByText('read_file')).toBeNull())
    expect(screen.getByText('http_post')).toBeTruthy()
  })
  it('opens the trace drawer with waterfall and failing check', async () => {
    go('#/feed?trace=trace-1')
    expect(await screen.findByRole('dialog', { name: 'Trace details' })).toBeTruthy()
    expect(await screen.findByLabelText('Span waterfall')).toBeTruthy()
    expect(await screen.findByText('Why:')).toBeTruthy()
  })
  it('traces, approvals and agents render', async () => {
    go('#/traces')
    expect(await screen.findByText('trace-1')).toBeTruthy()
    cleanup(); go('#/approvals')
    expect(await screen.findByText('send_email')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some((c) => String(c[0]).includes('/api/approvals/ap-1/approve'))).toBe(true))
    cleanup(); go('#/agents')
    expect((await screen.findAllByText('Connected')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Disconnect support-bot/ }))
    expect(await screen.findByText('Click again to confirm')).toBeTruthy()
  })
  it('opens the command palette with Ctrl+K', async () => {
    go('#/')
    await screen.findByText('Latest decisions')
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByPlaceholderText(/Search a trace/)).toBeTruthy()
  })
  it('performance shows percentiles, models and costly prompts', async () => {
    go('#/performance')
    expect(await screen.findByText('Response time p50')).toBeTruthy()
    expect(await screen.findByText('Summarize the quarterly report')).toBeTruthy()
    expect((await screen.findAllByText('gpt-4o')).length).toBeGreaterThan(0)
  })
  it('data flow, graph and risk pages render their data', async () => {
    go('#/flow')
    expect(await screen.findByText('Largest flows')).toBeTruthy()
    expect((await screen.findAllByText('SECRET')).length).toBeGreaterThan(0)
    cleanup(); go('#/graph')
    expect(await screen.findByText('Sensitive data')).toBeTruthy()
    cleanup(); go('#/risk')
    expect(await screen.findByText(/slow and risky/)).toBeTruthy()
    expect((await screen.findAllByText('http_post')).length).toBeGreaterThan(0)
  })
  it('compliance exports and verifies the audit chain', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}) // jsdom ne sait pas télécharger
    go('#/compliance')
    expect(await screen.findByText('Security events', { selector: 'h2' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: /Export \d+ events as CSV/ }))
    expect((URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /Verify audit chain/ }))
    expect(await screen.findByText('Audit chain intact')).toBeTruthy()
  })
  it('settings: keys shows a new key once, integrations fill the host', async () => {
    go('#/settings')
    expect(await screen.findByText('production')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    expect(await screen.findByText(/ag_live_SECRET_ONCE_123/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Integrations' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'HTTP Gateway' }))
    const code = await screen.findByText(/curl -X POST/)
    expect(code.textContent).toContain(window.location.origin + '/span')
    expect(code.textContent).not.toContain('YOUR_AGENTGUARD_HOST')
  })
  it('settings: budgets, policies and alerts list their items', async () => {
    go('#/settings?tab=budgets')
    expect(await screen.findByText(/\$12\.00 of \$10\.00/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Policies' }))
    expect(await screen.findByText(/pii_detection > 0.8/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enabled' }))
    await waitFor(() => expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'PATCH')).toBe(true))
    fireEvent.click(screen.getByRole('tab', { name: 'Alerts' }))
    expect(await screen.findByText('Daily spend')).toBeTruthy()
    expect((await screen.findAllByText('slack', { exact: false })).length).toBeGreaterThan(0)
  })
  it('sidebar collapses, remembers it and toggles with Ctrl+B', async () => {
    localStorage.clear()
    go('#/')
    const btn = await screen.findByRole('button', { name: 'Collapse sidebar' })
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).getAttribute('aria-expanded')).toBe('false')
    expect(localStorage.getItem('cerbere.sidebar.collapsed')).toBe('1')
    expect(screen.getByRole('link', { name: 'Performance' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(await screen.findByRole('button', { name: 'Collapse sidebar' })).toBeTruthy()
    expect(localStorage.getItem('cerbere.sidebar.collapsed')).toBe('0')
  })
  it('integration snippets use the real package, import and variables', () => {
    expect(INTEGRATIONS.map((i) => i.id)).toEqual(['python', 'mcp', 'http', 'openai', 'anthropic', 'langgraph', 'crewai', 'composio'])
    for (const i of INTEGRATIONS) {
      expect(i.code, i.id).not.toMatch(/pip install agentguard/) // ce paquet n'existe pas sur PyPI
      expect(i.code, i.id).not.toMatch(/agentguard_sdk/) // absent du wheel publié
      expect(i.code, i.id).not.toMatch(/\/api\/spans/) // route inexistante
      expect(i.code, i.id).not.toMatch(/AGENTGUARD_COLLECTOR_URL/) // la variable MCP est AGENTGUARD_MCP_COLLECTOR_URL
    }
    expect(INTEGRATIONS.find((i) => i.id === 'python')!.code).toContain('pip install cerbere-ag')
    expect(INTEGRATIONS.find((i) => i.id === 'mcp')!.code).toContain('AGENTGUARD_MCP_COLLECTOR_URL')
  })
  it('footer has Docs, Support and Legal (no classic dashboard link)', async () => {
    go('#/')
    await screen.findByText('Latest decisions')
    expect(screen.queryByText(/Classic dashboard/)).toBeNull()
    const legal = screen.getByRole('link', { name: 'Legal' })
    expect(legal.getAttribute('href')).toBe('/legal')
    expect(legal.getAttribute('target')).toBe('_blank')
    expect(legal.getAttribute('rel')).toContain('noopener')
    fireEvent.click(screen.getByRole('button', { name: 'Documentation' }))
    expect(await screen.findByRole('dialog', { name: 'Documentation' })).toBeTruthy()
    expect(screen.getByText('Start in three steps')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Documentation' })).toBeNull())
  })
  it('support dialog builds a mailto with diagnostics and a security notice', async () => {
    go('#/')
    await screen.findByText('Latest decisions')
    await screen.findByText('chris@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Contact support' }))
    const send = (await screen.findByRole('link', { name: /Send by email/ })) as HTMLAnchorElement
    expect(send.getAttribute('href')).toMatch(/^mailto:hello@cerbereag\.site\?subject=/)
    const decoded = decodeURIComponent(send.getAttribute('href') || '')
    expect(decoded).toContain('[Question] Cerbere')
    expect(decoded).toContain('chris@example.com')
    fireEvent.change(screen.getByLabelText('What is it about?'), { target: { value: 'security' } })
    expect(await screen.findByText(/do not post security issues publicly/)).toBeTruthy()
    expect(decodeURIComponent((screen.getByRole('link', { name: /Send by email/ }) as HTMLAnchorElement).getAttribute('href') || '')).toContain('[Security] Cerbere')
  })
  it('palette offers the help actions', async () => {
    go('#/')
    await screen.findByText('Latest decisions')
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.click(await screen.findByText('Contact support'))
    expect(await screen.findByRole('dialog', { name: 'Contact support' })).toBeTruthy()
  })
  it('logs no React errors', () => {
    const real = errors.filter((e) => !String((e as unknown[])[0]).includes('not wrapped in act'))
    expect(real).toEqual([])
  })
})
