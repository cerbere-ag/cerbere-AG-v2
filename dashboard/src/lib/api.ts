export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    window.location.assign('/login')
    throw new ApiError(401, 'Your session expired. Sign in again.')
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const d = data as { error?: string; message?: string } | null
    throw new ApiError(res.status, d?.error || d?.message || `Request failed (${res.status})`)
  }
  return data as T
}

export const get = <T,>(path: string) => request<T>('GET', path)
export const post = <T,>(path: string, body: unknown = {}) => request<T>('POST', path, body)

/* ---------- types (forme réelle des réponses du collector) ---------- */

export type Decision = 'allowed' | 'flagged' | 'blocked'
export type Risk = 'low' | 'medium' | 'high' | 'critical'

export interface AuditEvent {
  event_id: string
  timestamp: string
  agent: string | null
  provider: string | null
  event_type: string | null
  model: string | null
  tool: string | null
  risk: Risk
  detection: string | null
  decision: Decision
  policy: string | null
  trace_id: string | null
  span_id: string | null
  prompt: string
}

export interface AuditSummary {
  total: number
  blocked: number
  flagged: number
  allowed: number
  high_risk: number
  critical: number
  require_approval: number
  affected_agents: number
}

export interface SecurityCheck {
  check_name?: string
  passed?: boolean
  risk_level?: string
  details?: string
}

export interface Span {
  span_id: string | null
  trace_id: string
  span_type: string | null
  timestamp: number | null
  latency_ms: number | null
  input_data: Record<string, unknown> | null
  output_data: Record<string, unknown> | null
  security_checks: SecurityCheck[]
  blocked: boolean
  block_reason: string | null
  cost_usd: number | null
  input_tokens: number | null
  output_tokens: number | null
  created_at: string | null
  detection_layer: string | null
  ml_score: number | null
  llm_score: number | null
  llm_reason: string | null
  model: string | null
  agent_id?: string | null
}

export interface TraceRow {
  trace_id: string
  span_count: number
  blocked_count: number | null
  total_cost: number | null
  last_seen: string
  detection_layers: string | null
}

export type AgentState = 'connected' | 'idle' | 'offline' | 'disconnected'

export interface Agent {
  agent_id: string
  name: string
  status: string
  state: AgentState
  sdk_version: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  disconnected_at: string | null
  disconnected_by: string | null
  calls: number
  blocked: number
  cost_usd: number
  pending_approvals: number
}

export interface AgentsResponse {
  agents: Agent[]
  counts: Record<AgentState, number>
  total: number
}

export interface Approval {
  id: string
  agent_id: string
  tool_name: string
  params: unknown
  reason: string | null
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  resolved_at: string | null
  resolved_by: string | null
}

export interface ApprovalsResponse {
  approvals: Approval[]
  count: number
  counts: { pending: number; approved: number; rejected: number }
}

export interface Me {
  authenticated: boolean
  type?: string
  user?: { email: string; display_name: string | null; role: string; org_id: string }
}

export interface HeatCell { date: string; total: number; blocked: number; flagged: number }
export interface DailyRow { day: string; total: number; blocked: number }
export interface CostRow { day: string; cost: number; tokens: number }
export interface Metrics {
  total_spans: number
  blocked_operations: number
  total_cost_usd: number
  top_threats: { reason: string; count: number }[]
  detection_layers: Record<string, unknown>
}
