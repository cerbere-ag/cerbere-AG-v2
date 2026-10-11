import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  get,
  type AgentsResponse,
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
