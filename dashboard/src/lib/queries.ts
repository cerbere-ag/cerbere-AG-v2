import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  get,
  type AgentsResponse,
  type AlertRule,
  type ApiKey,
  type Budget,
  type CheckBreakdown,
  type Destination,
  type ExpensiveSpan,
  type FlowResponse,
  type GraphResponse,
  type LatencyDist,
  type ModelStat,
  type PolicyRule,
  type ToolsResponse,
  type ApprovalsResponse,
  type AuditEvent,
  type AuditSummary,
  type CostRow,
  type DailyRow,
  type HeatCell,
  type Me,
  type Metrics,
  type Span,
  type TraceRow,
} from './api'

const POLL = 3000

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => get<Me>('/api/auth/me'), staleTime: 5 * 60_000 })

export const TRAIL_LIMIT = 300

export const useTrail = () =>
  useQuery({
    queryKey: ['trail'],
    queryFn: () => get<AuditEvent[]>(`/api/audit/trail?limit=${TRAIL_LIMIT}`),
    refetchInterval: POLL,
    placeholderData: keepPreviousData,
  })

export const useSummary = () =>
  useQuery({
    queryKey: ['summary'],
    queryFn: () => get<AuditSummary>('/api/audit/summary'),
    refetchInterval: 15_000,
  })

export const useMetrics = () =>
  useQuery({
    queryKey: ['metrics'],
    queryFn: () => get<Metrics>('/api/metrics'),
    refetchInterval: 30_000,
  })

export const useDaily = () =>
  useQuery({
    queryKey: ['daily'],
    queryFn: () => get<DailyRow[]>('/api/trend/daily'),
    refetchInterval: 60_000,
  })

export const useCost = () =>
  useQuery({
    queryKey: ['cost'],
    queryFn: () => get<CostRow[]>('/api/cost/trend'),
    refetchInterval: 60_000,
  })

export const useHeatmap = (days = 91) =>
  useQuery({
    queryKey: ['heatmap', days],
    queryFn: () => get<{ days: number; cells: HeatCell[] }>(`/api/heatmap?days=${days}`),
    refetchInterval: 60_000,
  })

export const useTraces = () =>
  useQuery({
    queryKey: ['traces'],
    queryFn: () => get<TraceRow[]>('/api/traces'),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  })

export const useTrace = (traceId: string | null) =>
  useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => get<Span[]>(`/api/traces/${encodeURIComponent(traceId as string)}`),
    enabled: !!traceId,
  })

export const useAgents = () =>
  useQuery({
    queryKey: ['agents'],
    queryFn: () => get<AgentsResponse>('/api/agents'),
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  })

export const useApprovals = (status: 'pending' | 'history') =>
  useQuery({
    queryKey: ['approvals', status],
    queryFn: () => get<ApprovalsResponse>(`/api/approvals?status=${status}`),
    refetchInterval: POLL,
    placeholderData: keepPreviousData,
  })

/* ---------- performance ---------- */

export const useLatency = () =>
  useQuery({ queryKey: ['latency'], queryFn: () => get<LatencyDist>('/api/latency/distribution'), refetchInterval: 30_000 })

export const useModels = () =>
  useQuery({ queryKey: ['models'], queryFn: () => get<ModelStat[]>('/api/models'), refetchInterval: 30_000 })

export const useChecks = () =>
  useQuery({ queryKey: ['checks'], queryFn: () => get<CheckBreakdown[]>('/api/checks/breakdown'), refetchInterval: 30_000 })

export const useExpensive = () =>
  useQuery({ queryKey: ['expensive'], queryFn: () => get<ExpensiveSpan[]>('/api/spans/expensive'), refetchInterval: 60_000 })

/* ---------- réglages ---------- */

export const useKeys = () => useQuery({ queryKey: ['keys'], queryFn: () => get<{ keys: ApiKey[] }>('/api/keys') })
export const useBudgets = () =>
  useQuery({ queryKey: ['budgets'], queryFn: () => get<{ budgets: Budget[]; total: number }>('/api/budgets'), refetchInterval: 15_000 })
export const usePolicies = () =>
  useQuery({ queryKey: ['policies'], queryFn: () => get<{ rules: PolicyRule[]; total: number }>('/api/policy-rules') })
export const useAlertRules = () =>
  useQuery({ queryKey: ['alert-rules'], queryFn: () => get<{ alert_rules: AlertRule[]; count: number }>('/api/alert-rules') })
export const useDestinations = () =>
  useQuery({ queryKey: ['destinations'], queryFn: () => get<{ destinations: Destination[]; total: number }>('/api/alert-destinations') })

/* ---------- insights ---------- */

export const useFlow = (days: number) =>
  useQuery({ queryKey: ['flow', days], queryFn: () => get<FlowResponse>(`/api/insights/flow?days=${days}`), refetchInterval: 30_000, placeholderData: keepPreviousData })
export const useGraph = (days: number) =>
  useQuery({ queryKey: ['graph', days], queryFn: () => get<GraphResponse>(`/api/insights/graph?days=${days}`), refetchInterval: 30_000, placeholderData: keepPreviousData })
export const useTools = (days: number) =>
  useQuery({ queryKey: ['tools', days], queryFn: () => get<ToolsResponse>(`/api/insights/tools?days=${days}`), refetchInterval: 30_000, placeholderData: keepPreviousData })
