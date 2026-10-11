import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

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
const routes: Record<string, unknown> = {
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
    const body = init?.method === 'POST' ? { ok: true } : routes[path]
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
  it('logs no React errors', () => {
    const real = errors.filter((e) => !String((e as unknown[])[0]).includes('not wrapped in act'))
    expect(real).toEqual([])
  })
})
