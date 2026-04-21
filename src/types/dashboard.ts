// ─── Dashboard API Response Types ─────────────────────────────────

/** GET /api/dashboard/overview */
export interface DashboardOverview {
  fromUtc: string;
  toUtc: string;
  timezone: string;
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  runningNow: number;
  completedExecutions: number;
  failedExecutions: number;
  successRate: number;
  failureRate: number;
  averageDurationMinutes: number;
  p95DurationMinutes: number;
}

/** GET /api/dashboard/trends */
export interface DashboardTrendPoint {
  bucket: string;
  value: number;
}

export interface DashboardTrendsResponse {
  fromUtc: string;
  toUtc: string;
  timezone: string;
  metric: string;
  granularity: string;
  points: DashboardTrendPoint[];
}

export type TrendMetric = 'throughput' | 'successrate' | 'duration';
export type TrendGranularity = 'hour' | 'day';

/** GET /api/dashboard/failures/top */
export interface DashboardTopFailureItem {
  definitionId: string;
  definitionName: string;
  failureCount: number;
  lastFailureAt: string;
}

/** SSE /api/dashboard/live */
export interface DashboardLiveSnapshot {
  timestamp: string;
  runningInstances: number;
  pendingPointers: number;
  failedLastHour: number;
}

/** GET /api/dashboard/workers/health */
export interface WorkerHealthItem {
  workerId: string;
  lastSeenAt: string;
  status: 'Healthy' | 'Stale';
  errorCountLast15m: number;
}

/** GET /api/dashboard/queues/health */
export interface QueueHealthResponse {
  pendingPointers: number;
  runningPointers: number;
  suspendedPointers: number;
  outboxBacklog: number;
}

/** GET /api/dashboard/scheduler/health */
export interface SchedulerHealthResponse {
  activeSchedules: number;
  pendingSyncTasks: number;
  failedSyncTasks: number;
  overdueSyncTasks: number;
}

/** GET /api/dashboard/webhooks/health */
export interface WebhookHealthResponse {
  activeRoutes: number;
  idempotencyEnabledRoutes: number;
  triggeredExecutionsLast24h: number;
}
