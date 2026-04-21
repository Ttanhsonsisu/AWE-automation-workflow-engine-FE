import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import apiClient from '@/services/apiClient';
import { getAccessToken } from '@/lib/keycloak';
import type {
  DashboardOverview,
  DashboardTrendsResponse,
  DashboardTopFailureItem,
  DashboardLiveSnapshot,
  WorkerHealthItem,
  QueueHealthResponse,
  SchedulerHealthResponse,
  WebhookHealthResponse,
  TrendMetric,
  TrendGranularity,
} from '@/types/dashboard';

// ─── Fetch functions ──────────────────────────────────────────────

const fetchOverview = async (from?: string, to?: string): Promise<DashboardOverview> => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  params.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await apiClient.get('/dashboard/overview', { params });
  return data.data ?? data;
};

const fetchTrends = async (
  metric: TrendMetric = 'throughput',
  granularity: TrendGranularity = 'day',
  from?: string,
  to?: string,
): Promise<DashboardTrendsResponse> => {
  const params: Record<string, string> = { metric, granularity };
  if (from) params.from = from;
  if (to) params.to = to;
  params.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await apiClient.get('/dashboard/trends', { params });
  return data.data ?? data;
};

const fetchTopFailures = async (limit = 10): Promise<DashboardTopFailureItem[]> => {
  const { data } = await apiClient.get('/dashboard/failures/top', { params: { limit } });
  return data.data ?? data;
};

const fetchWorkersHealth = async (): Promise<WorkerHealthItem[]> => {
  const { data } = await apiClient.get('/dashboard/workers/health');
  return data.data ?? data;
};

const fetchQueuesHealth = async (): Promise<QueueHealthResponse> => {
  const { data } = await apiClient.get('/dashboard/queues/health');
  return data.data ?? data;
};

const fetchSchedulerHealth = async (): Promise<SchedulerHealthResponse> => {
  const { data } = await apiClient.get('/dashboard/scheduler/health');
  return data.data ?? data;
};

const fetchWebhooksHealth = async (): Promise<WebhookHealthResponse> => {
  const { data } = await apiClient.get('/dashboard/webhooks/health');
  return data.data ?? data;
};

// ─── React Query hooks ────────────────────────────────────────────

export const useDashboardOverview = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['dashboard', 'overview', from, to],
    queryFn: () => fetchOverview(from, to),
    refetchInterval: 30_000, // auto-refresh every 30s
  });

export const useDashboardTrends = (
  metric: TrendMetric = 'throughput',
  granularity: TrendGranularity = 'day',
  from?: string,
  to?: string,
) =>
  useQuery({
    queryKey: ['dashboard', 'trends', metric, granularity, from, to],
    queryFn: () => fetchTrends(metric, granularity, from, to),
  });

export const useDashboardTopFailures = (limit = 10) =>
  useQuery({
    queryKey: ['dashboard', 'failures-top', limit],
    queryFn: () => fetchTopFailures(limit),
  });

export const useDashboardWorkersHealth = () =>
  useQuery({
    queryKey: ['dashboard', 'workers-health'],
    queryFn: fetchWorkersHealth,
    refetchInterval: 15_000,
  });

export const useDashboardQueuesHealth = () =>
  useQuery({
    queryKey: ['dashboard', 'queues-health'],
    queryFn: fetchQueuesHealth,
    refetchInterval: 15_000,
  });

export const useDashboardSchedulerHealth = () =>
  useQuery({
    queryKey: ['dashboard', 'scheduler-health'],
    queryFn: fetchSchedulerHealth,
    refetchInterval: 30_000,
  });

export const useDashboardWebhooksHealth = () =>
  useQuery({
    queryKey: ['dashboard', 'webhooks-health'],
    queryFn: fetchWebhooksHealth,
    refetchInterval: 30_000,
  });

// ─── SSE live hook ────────────────────────────────────────────────

export const useDashboardLive = () => {
  const [snapshot, setSnapshot] = useState<DashboardLiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(async () => {
    // Close previous connection
    eventSourceRef.current?.close();

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = await getAccessToken();
    const url = new URL(`${baseUrl}/dashboard/live`);
    if (token) url.searchParams.set('access_token', token);

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.addEventListener('dashboard', (e) => {
      try {
        setSnapshot(JSON.parse(e.data));
        setConnected(true);
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 5s
      setTimeout(() => connect(), 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { snapshot, connected };
};
